/**
 * Singleton application store (Svelte 5 runes).
 *
 * Holds all shared state and business logic so that routes stay thin.
 * Call `app.init()` from the root layout's onMount and `app.destroy()` from onDestroy.
 */

import { defaultAiConfig, loadAiConfig, type AiConfig } from '$lib/ai-config';
import {
    clearAllInvoices,
    getAllInvoices,
    getSetting,
    initializeDatabase,
    saveInvoicesBatch,
} from '$lib/db-sqlite';
import type { Filters } from '$lib/filters';
import { applyFilters, countActiveFilters, emptyFilters } from '$lib/filters';
import { extractXmlFromP7m, parseXml, type Fattura } from '$lib/parser';
import {
    loadProject,
    loadProjectsMeta,
    saveProject,
    touchProjectLastOpened,
    updateProject,
    type Project,
    type ProjectMeta,
} from '$lib/projects';
import JSZip from 'jszip';
import { tick } from 'svelte';

type LoadingProgress = {
  parsingDone: number;
  parsingTotal: number;
  savingDone: number;
  savingTotal: number;
  stage: 'idle' | 'parsing' | 'saving';
};

type SavedState = {
  fattureCount: number;
  filtersSignature: string;
};

function normalizeFiltersSignature(filters: Filters): string {
  return JSON.stringify({
    dataFrom: filters.dataFrom,
    dataTo: filters.dataTo,
    fornitori: [...filters.fornitori].sort(),
    clienti: [...filters.clienti].sort(),
    importoMin: filters.importoMin,
    importoMax: filters.importoMax,
    tipoDocumento: [...filters.tipoDocumento].sort(),
    regimeFiscale: filters.regimeFiscale,
    numero: filters.numero,
    formatoTrasmissione: filters.formatoTrasmissione,
    testoLibero: filters.testoLibero,
  });
}

function createAppStore() {
  // ── Core ──────────────────────────────────────────────────────────────────
  let fatture = $state<Fattura[]>([]);
  let filters = $state(emptyFilters());
  let loading = $state(false);
  let loadingProgress = $state<LoadingProgress>({
    parsingDone: 0,
    parsingTotal: 0,
    savingDone: 0,
    savingTotal: 0,
    stage: 'idle',
  });
  let errors = $state<string[]>([]);
  let openingProject = $state(false);

  let filtrate = $derived(applyFilters(fatture, filters));
  let activeFilters = $derived(countActiveFilters(filters));

  // ── Project ───────────────────────────────────────────────────────────────
  let currentProject = $state<{ id: string; name: string } | null>(null);
  let isDirty = $state(false);
  let savedState = $state<SavedState>({
    fattureCount: 0,
    filtersSignature: normalizeFiltersSignature(emptyFilters()),
  });

  function syncSavedState() {
    savedState = {
      fattureCount: fatture.length,
      filtersSignature: normalizeFiltersSignature(filters),
    };
  }

  function computeIsDirty() {
    return (
      fatture.length !== savedState.fattureCount ||
      normalizeFiltersSignature(filters) !== savedState.filtersSignature
    );
  }

  // ── AI ────────────────────────────────────────────────────────────────────
  let isAiRunning = $state(false);
  let aiConfig = $state<AiConfig>({ ...defaultAiConfig });

  // ── Panel / dialog visibility ─────────────────────────────────────────────
  let aiOpen = $state(false);
  let aiRunningOpen = $state(false);
  let projectsOpen = $state(false);
  let saveDialogOpen = $state(false);
  let settingsOpen = $state(false);
  let importDialogOpen = $state(false);

  // ── Projects list ─────────────────────────────────────────────────────────
  let projectsList = $state<ProjectMeta[]>([]);
  let loadingProjects = $state(false);

  // ── Unsaved-changes dialog ────────────────────────────────────────────────
  type PendingAction =
    | { type: 'close' }
    | { type: 'clear' }
    | { type: 'open'; project: Project };

  let pendingAction = $state<PendingAction | null>(null);
  let unsavedOpen = $state(false);

  let unsavedSaveLabel = $derived(
    pendingAction?.type === 'close'
      ? 'Salva e chiudi finestra'
      : pendingAction?.type === 'clear'
        ? 'Salva e chiudi progetto'
        : 'Salva e apri'
  );
  let unsavedDiscardLabel = $derived(
    pendingAction?.type === 'close' || pendingAction?.type === 'clear'
      ? 'Chiudi comunque'
      : 'Apri comunque'
  );

  // ── Effects ───────────────────────────────────────────────────────────────
  // $effect needs an explicit root when used outside a component.
  const cleanupEffects = $effect.root(() => {
    // Re-mark dirty whenever fatture or any filter field changes.
    $effect(() => {
      void JSON.stringify(filters);
      void fatture.length;
      isDirty = computeIsDirty();
    });

    // Sync the macOS traffic-light close-button dot (•).
    $effect(() => {
      const edited = isDirty || isAiRunning;
      import('@tauri-apps/api/core')
        .then(({ invoke }) => invoke('set_document_edited', { edited }))
        .catch(() => {});
    });
  });

  // ── Tauri lifecycle ───────────────────────────────────────────────────────
  let unlistenClose: (() => void) | undefined;

  async function init() {
    await initializeDatabase();
    fatture = await getAllInvoices();
    aiConfig = await loadAiConfig();

    loadingProjects = true;
    projectsList = await loadProjectsMeta();
    loadingProjects = false;

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      unlistenClose = await getCurrentWindow().onCloseRequested((event) => {
        if (!isDirty && !isAiRunning) return;
        event.preventDefault();
        pendingAction = { type: 'close' };
        if (isAiRunning) aiRunningOpen = true;
        else unsavedOpen = true;
      });
    } catch {
      // Not running inside Tauri (e.g. browser dev mode) — ignore.
    }
  }

  function destroy() {
    unlistenClose?.();
    cleanupEffects();
  }

  // ── File import ───────────────────────────────────────────────────────────
  function isMacMeta(path: string): boolean {
    const name = path.split('/').pop() ?? path;
    return name.startsWith('._') || path.includes('__MACOSX');
  }

  async function compressAndSaveFiles(fattureToSave: Fattura[]): Promise<string | undefined> {
    const keepFiles = await getSetting('keepFilesAfterImport');
    if (keepFiles !== 'true') return undefined;
    try {
      const { appDataDir, join } = await import('@tauri-apps/api/path');
      const { mkdir, writeFile } = await import('@tauri-apps/plugin-fs');
      const importsDir = await join(await appDataDir(), 'imports');
      await mkdir(importsDir, { recursive: true });
      const zipPath = await join(
        importsDir,
        `import-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
      );
      const zip = new JSZip();
      for (const fattura of fattureToSave) zip.file(fattura.fileName, fattura.rawXml);
      await writeFile(zipPath, await zip.generateAsync({ type: 'uint8array' }));
      return zipPath;
    } catch (err) {
      console.error('Failed to compress and save files:', err);
      return undefined;
    }
  }

  async function processFiles(files: File[]) {
    loading = true;
    errors = [];
    loadingProgress = {
      parsingDone: 0,
      parsingTotal: 0,
      savingDone: 0,
      savingTotal: 0,
      stage: 'parsing',
    };
    const xmlFiles: { name: string; text: string }[] = [];

    try {
      for (const file of files) {
        if (file.name.endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir || isMacMeta(path)) continue;
            const lower = path.toLowerCase();
            const name = path.split('/').pop() ?? path;
            if (lower.endsWith('.xml')) {
              xmlFiles.push({ name, text: await entry.async('string') });
            } else if (lower.endsWith('.p7m')) {
              try {
                xmlFiles.push({ name, text: extractXmlFromP7m(await entry.async('arraybuffer')) });
              } catch (e) {
                errors = [...errors, `${name}: ${e}`];
              }
            }
          }
        } else if (file.name.toLowerCase().endsWith('.xml') && !isMacMeta(file.name)) {
          xmlFiles.push({ name: file.name, text: await file.text() });
        } else if (file.name.toLowerCase().endsWith('.p7m') && !isMacMeta(file.name)) {
          try {
            xmlFiles.push({ name: file.name, text: extractXmlFromP7m(await file.arrayBuffer()) });
          } catch (e) {
            errors = [...errors, `${file.name}: ${e}`];
          }
        }
      }

      loadingProgress = {
        ...loadingProgress,
        parsingDone: 0,
        parsingTotal: xmlFiles.length,
      };
      const parsed: Fattura[] = [];
      for (const { name, text } of xmlFiles) {
        const f = parseXml(name, text);
        if (f) parsed.push(f);
        else errors.push(name);
        loadingProgress = {
          ...loadingProgress,
          parsingDone: loadingProgress.parsingDone + 1,
        };
      }

      if (parsed.length > 0) {
        const compressedFilePath = await compressAndSaveFiles(parsed);
        const projectId = currentProject?.id ?? null;
        loadingProgress = {
          ...loadingProgress,
          stage: 'saving',
          savingDone: 0,
          savingTotal: parsed.length,
        };
        await saveInvoicesBatch(
          parsed,
          compressedFilePath,
          projectId,
          40,
          (savedCount, totalCount) => {
            loadingProgress = {
              ...loadingProgress,
              stage: 'saving',
              savingDone: savedCount,
              savingTotal: totalCount,
            };
          }
        );
        fatture = await getAllInvoices(projectId);
        importDialogOpen = false;
      }
    } catch (error) {
      errors = [...errors, `Errore durante l'importazione: ${error}`];
    } finally {
      loading = false;
      loadingProgress = {
        ...loadingProgress,
        stage: 'idle',
      };
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function handleSaveClick() {
    if (currentProject) void handleQuickSave();
    else saveDialogOpen = true;
  }

  async function handleQuickSave() {
    if (!currentProject) return;
    await updateProject(currentProject.id, currentProject.name, fatture, filters);
    syncSavedState();
    isDirty = false;
  }

  async function handleSaveNewProject(name: string): Promise<void> {
    const saved = await saveProject(name, fatture, filters);
    currentProject = { id: saved.id, name: saved.name };
    syncSavedState();
    isDirty = false;
    projectsList = await loadProjectsMeta();
  }

  // ── Project opening ───────────────────────────────────────────────────────
  async function doOpenProject(project: Project) {
    openingProject = true;
    try {
      fatture = await getAllInvoices(project.id);
      filters = project.filters;
      currentProject = { id: project.id, name: project.name };
      errors = [];
      await tick();
      syncSavedState();
      isDirty = false;
      await touchProjectLastOpened(project.id);
      await refreshProjectsList();
    } finally {
      openingProject = false;
    }
  }

  async function handleOpenProjectRequest(project: Project) {
    if (isDirty) {
      pendingAction = { type: 'open', project };
      unsavedOpen = true;
      projectsOpen = false;
    } else {
      await doOpenProject(project);
      projectsOpen = false;
    }
  }

  async function handleOpenProjectFromList(projectMeta: ProjectMeta) {
    const project = await loadProject(projectMeta.id);
    if (project) await handleOpenProjectRequest(project);
  }

  async function refreshProjectsList() {
    loadingProjects = true;
    projectsList = await loadProjectsMeta();
    loadingProjects = false;
  }

  // ── Clear ─────────────────────────────────────────────────────────────────
  function handleClearClick() {
    if (isDirty) {
      pendingAction = { type: 'clear' };
      unsavedOpen = true;
    } else {
      void doClearAll();
    }
  }

  async function doClearAll() {
    if (!currentProject) {
      await clearAllInvoices(null);
    }
    fatture = [];
    filters = emptyFilters();
    errors = [];
    currentProject = null;
    syncSavedState();
    isDirty = false;
    projectsList = await loadProjectsMeta();
  }

  function resetFilters() {
    filters = emptyFilters();
  }

  // ── Unsaved-changes dialog ────────────────────────────────────────────────
  async function handleUnsavedSave(name?: string): Promise<void> {
    if (currentProject) {
      await updateProject(currentProject.id, currentProject.name, fatture, filters);
      syncSavedState();
      isDirty = false;
    } else if (name) {
      await handleSaveNewProject(name);
    }
    unsavedOpen = false;
    await executeAction();
  }

  async function handleUnsavedDiscard() {
    unsavedOpen = false;
    await executeAction();
  }

  function handleUnsavedCancel() {
    pendingAction = null;
    unsavedOpen = false;
  }

  async function executeAction() {
    if (!pendingAction) return;
    const action = pendingAction;
    pendingAction = null;
    if (action.type === 'close') {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('force_exit');
    } else if (action.type === 'clear') {
      void doClearAll();
    } else if (action.type === 'open') {
      await doOpenProject(action.project);
    }
  }

  // ── AI running dialog ─────────────────────────────────────────────────────
  async function handleAiRunningConfirm() {
    aiRunningOpen = false;
    isAiRunning = false;
    await executeAction();
  }

  function handleAiRunningCancel() {
    aiRunningOpen = false;
    pendingAction = null;
  }

  // ── Public interface ──────────────────────────────────────────────────────
  return {
    // Readable state
    get fatture() { return fatture; },
    get filters() { return filters; },
    get loading() { return loading; },
    get loadingProgress() { return loadingProgress; },
    get errors() { return errors; },
    get openingProject() { return openingProject; },
    get filtrate() { return filtrate; },
    get activeFilters() { return activeFilters; },
    get currentProject() { return currentProject; },
    get isDirty() { return isDirty; },
    get isAiRunning() { return isAiRunning; },
    get aiConfig() { return aiConfig; },
    get projectsList() { return projectsList; },
    get loadingProjects() { return loadingProjects; },
    get unsavedSaveLabel() { return unsavedSaveLabel; },
    get unsavedDiscardLabel() { return unsavedDiscardLabel; },

    // Writable UI toggles (used with bind: on sheets/dialogs)
    get aiOpen() { return aiOpen; },
    set aiOpen(v: boolean) { aiOpen = v; },
    get aiRunningOpen() { return aiRunningOpen; },
    set aiRunningOpen(v: boolean) { aiRunningOpen = v; },
    get projectsOpen() { return projectsOpen; },
    set projectsOpen(v: boolean) { projectsOpen = v; },
    get saveDialogOpen() { return saveDialogOpen; },
    set saveDialogOpen(v: boolean) { saveDialogOpen = v; },
    get settingsOpen() { return settingsOpen; },
    set settingsOpen(v: boolean) { settingsOpen = v; },
    get importDialogOpen() { return importDialogOpen; },
    set importDialogOpen(v: boolean) { importDialogOpen = v; },
    get unsavedOpen() { return unsavedOpen; },
    set unsavedOpen(v: boolean) { unsavedOpen = v; },
    get isAiRunningWritable() { return isAiRunning; },
    set isAiRunningWritable(v: boolean) { isAiRunning = v; },
    get aiConfigWritable() { return aiConfig; },
    set aiConfigWritable(v: AiConfig) { aiConfig = v; },

    // Lifecycle
    init,
    destroy,

    // Actions
    processFiles,
    handleSaveClick,
    handleSaveNewProject,
    handleOpenProjectRequest,
    handleOpenProjectFromList,
    handleClearClick,
    resetFilters,
    handleUnsavedSave,
    handleUnsavedDiscard,
    handleUnsavedCancel,
    handleAiRunningConfirm,
    handleAiRunningCancel,
  };
}

export const app = createAppStore();
