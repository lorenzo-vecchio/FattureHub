<script lang="ts">
  import { tick, onMount, onDestroy } from 'svelte';
  import { parseXml, extractXmlFromP7m, type Fattura } from '$lib/parser';
  import { applyFilters, emptyFilters, countActiveFilters } from '$lib/filters';
  import { saveProject, updateProject, type Project } from '$lib/projects';
  import { loadAiConfig, defaultAiConfig, type AiConfig } from '$lib/ai-config';
  import { db, saveInvoice, getAllInvoices, clearAllInvoices, initializeDatabase, getSetting, setSetting } from '$lib/db-dexie';
  import JSZip from 'jszip';

  import AppHeader from '$lib/components/app/AppHeader.svelte';
  import UploadZone from '$lib/components/app/UploadZone.svelte';
  import LoadingCard from '$lib/components/app/LoadingCard.svelte';
  import ErrorsCard from '$lib/components/app/ErrorsCard.svelte';
  import FiltersPanel from '$lib/components/app/FiltersPanel.svelte';
  import FattureResults from '$lib/components/app/FattureResults.svelte';
  import ProjectsSheet from '$lib/components/app/ProjectsSheet.svelte';
  import SaveProjectDialog from '$lib/components/app/SaveProjectDialog.svelte';
  import UnsavedDialog from '$lib/components/app/UnsavedDialog.svelte';
  import SettingsSheet from '$lib/components/app/SettingsSheet.svelte';
  import AiSheet from '$lib/components/app/AiSheet.svelte';
  import AiRunningDialog from '$lib/components/app/AiRunningDialog.svelte';

  // ── Core state ────────────────────────────────────────────────────────────
  let fatture = $state<Fattura[]>([]);
  let filters = $state(emptyFilters());
  let loading = $state(false);
  let loadingProgress = $state({ done: 0, total: 0 });
  let errors = $state<string[]>([]);

  let filtrate = $derived(applyFilters(fatture, filters));
  let activeFilters = $derived(countActiveFilters(filters));

  // ── Project state ─────────────────────────────────────────────────────────
  let currentProject = $state<{ id: string; name: string } | null>(null);
  let isDirty = $state(false);

  // Mark dirty whenever fatture or filters change while content is loaded.
  $effect(() => {
    void JSON.stringify(filters); // track all filter fields
    if (fatture.length > 0) isDirty = true;
    else isDirty = false;
  });

  // Sync macOS close button dot (•) with dirty/AI state
  $effect(() => {
    const edited = isDirty || isAiRunning;
    import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke('set_document_edited', { edited }))
      .catch(() => {});
  });

  // ── AI state ──────────────────────────────────────────────────────────────
  let isAiRunning = $state(false);
  let aiConfig = $state<AiConfig>({ ...defaultAiConfig });
  let aiOpen = $state(false);
  let aiRunningOpen = $state(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  let projectsOpen = $state(false);
  let saveDialogOpen = $state(false);
  let settingsOpen = $state(false);

  // Unsaved-changes dialog — shared for window close / clear / open-project
  type PendingAction = { type: 'close' } | { type: 'clear' } | { type: 'open'; project: Project };
  let pendingAction = $state<PendingAction | null>(null);
  let unsavedOpen = $state(false);
  let unsavedSaveLabel = $derived(
    pendingAction?.type === 'close' ? 'Salva e chiudi finestra' :
    pendingAction?.type === 'clear' ? 'Salva e chiudi progetto' :
    'Salva e apri'
  );
  let unsavedDiscardLabel = $derived(
    pendingAction?.type === 'close' ? 'Chiudi comunque' :
    pendingAction?.type === 'clear' ? 'Chiudi comunque' :
    'Apri comunque'
  );

  // ── File processing ───────────────────────────────────────────────────────
  function isMacMeta(path: string): boolean {
    const name = path.split('/').pop() ?? path;
    return name.startsWith('._') || path.includes('__MACOSX');
  }

  async function compressAndSaveFiles(fattureToSave: Fattura[]): Promise<string | undefined> {
    const keepFiles = await getSetting('keepFilesAfterImport')
    if (keepFiles !== 'true') return undefined
    
    try {
      const { appDataDir, join } = await import('@tauri-apps/api/path')
      const { mkdir, writeFile } = await import('@tauri-apps/plugin-fs')
      
      const baseDir = await appDataDir()
      const importsDir = await join(baseDir, 'imports')
      await mkdir(importsDir, { recursive: true })
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const zipFileName = `import-${timestamp}.zip`
      const zipPath = await join(importsDir, zipFileName)
      
      // Create zip using JSZip
      const zip = new JSZip()
      
      for (const fattura of fattureToSave) {
        zip.file(fattura.fileName, fattura.rawXml)
      }
      
      const zipContent = await zip.generateAsync({ type: 'uint8array' })
      
      // Save using Tauri's file system API
      await writeFile(zipPath, zipContent)
      
      return zipPath
    } catch (error) {
      console.error('Failed to compress and save files:', error)
      return undefined
    }
  }

  async function processFiles(files: File[]) {
    loading = true;
    errors = [];
    const xmlFiles: { name: string; text: string }[] = [];

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
              const buf = await entry.async('arraybuffer');
              xmlFiles.push({ name, text: extractXmlFromP7m(buf) });
            } catch (e) {
              errors = [...errors, `${name}: ${e}`];
            }
          }
        }
      } else if (file.name.toLowerCase().endsWith('.xml') && !isMacMeta(file.name)) {
        xmlFiles.push({ name: file.name, text: await file.text() });
      } else if (file.name.toLowerCase().endsWith('.p7m') && !isMacMeta(file.name)) {
        try {
          const buf = await file.arrayBuffer();
          xmlFiles.push({ name: file.name, text: extractXmlFromP7m(buf) });
        } catch (e) {
          errors = [...errors, `${file.name}: ${e}`];
        }
      }
    }

    loadingProgress = { done: 0, total: xmlFiles.length };
    const parsed: Fattura[] = [];
    for (const { name, text } of xmlFiles) {
      const f = parseXml(name, text);
      if (f) parsed.push(f);
      else errors.push(name);
      loadingProgress.done++;
    }

    // Save to database
    if (parsed.length > 0) {
      // Compress and save files if enabled
      const compressedFilePath = await compressAndSaveFiles(parsed)
      
      // Save each invoice to database
      for (const fattura of parsed) {
        await saveInvoice(fattura, compressedFilePath)
      }
      
      // Reload all invoices from database
      fatture = await getAllInvoices()
    }
    
    loading = false;
  }

  // ── Save logic ────────────────────────────────────────────────────────────
  function handleSaveClick() {
    if (currentProject) {
      void handleQuickSave();
    } else {
      saveDialogOpen = true;
    }
  }

  async function handleQuickSave() {
    if (!currentProject) return;
    await updateProject(currentProject.id, currentProject.name, fatture, filters);
    isDirty = false;
  }

  async function handleSaveNewProject(name: string): Promise<void> {
    const saved = await saveProject(name, fatture, filters);
    currentProject = { id: saved.id, name: saved.name };
    isDirty = false;
  }

  // ── Open project ──────────────────────────────────────────────────────────
  function handleOpenProjectRequest(project: Project) {
    projectsOpen = false;
    if (isDirty) {
      pendingAction = { type: 'open', project };
      unsavedOpen = true;
    } else {
      void doOpenProject(project);
    }
  }

  async function doOpenProject(project: Project) {
    // Clear existing invoices from database
    await clearAllInvoices();
    
    // Save project invoices to database
    for (const fattura of project.fatture) {
      await saveInvoice(fattura)
    }
    
    // Load from database
    fatture = await getAllInvoices();
    filters = project.filters;
    currentProject = { id: project.id, name: project.name };
    errors = [];
    await tick();
    isDirty = false;
  }

  // ── Clear all ─────────────────────────────────────────────────────────────
  function handleClearClick() {
    if (isDirty) {
      pendingAction = { type: 'clear' };
      unsavedOpen = true;
    } else {
      doClearAll();
    }
  }

  async function doClearAll() {
    await clearAllInvoices();
    fatture = [];
    filters = emptyFilters();
    errors = [];
    currentProject = null;
    isDirty = false;
  }

  function resetFilters() {
    filters = emptyFilters();
  }

  // ── Unsaved dialog actions ────────────────────────────────────────────────
  async function handleUnsavedSave(name?: string): Promise<void> {
    if (currentProject) {
      await updateProject(currentProject.id, currentProject.name, fatture, filters);
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
      doClearAll();
    } else if (action.type === 'open') {
      await doOpenProject(action.project);
    }
  }

  // ── Tauri window close ────────────────────────────────────────────────────
  let unlistenClose: (() => void) | undefined;

  onMount(async () => {
    // Initialize database and load invoices
    await initializeDatabase();
    fatture = await getAllInvoices();
    
    // Load AI config
    aiConfig = await loadAiConfig();

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      unlistenClose = await getCurrentWindow().onCloseRequested((event) => {
        if (!isDirty && !isAiRunning) return;
        event.preventDefault();
        pendingAction = { type: 'close' };
        if (isAiRunning) {
          aiRunningOpen = true;
        } else {
          unsavedOpen = true;
        }
      });
    } catch {
      // Not running in Tauri (e.g. browser dev mode) — ignore
    }
  });

  onDestroy(() => unlistenClose?.());

  // ── AI running dialog ─────────────────────────────────────────────────────
  async function handleAiRunningConfirm() {
    aiRunningOpen = false;
    isAiRunning = false; // force-stop
    await executeAction();
  }

  function handleAiRunningCancel() {
    aiRunningOpen = false;
    pendingAction = null;
  }
</script>

<div class="min-h-screen bg-muted/40">
  <AppHeader
    fattureCount={fatture.length}
    {activeFilters}
    {isDirty}
    currentProjectName={currentProject?.name ?? null}
    aiEnabled={aiConfig.enabled}
    {isAiRunning}
    onclear={handleClearClick}
    onopenprojects={() => (projectsOpen = true)}
    opensettings={() => (settingsOpen = true)}
    openai={() => (aiOpen = true)}
  />

  <div class="mx-auto max-w-7xl px-6 py-6">

    {#if fatture.length === 0 && !loading}
      <UploadZone onfiles={processFiles} />
    {/if}

    {#if loading}
      <LoadingCard done={loadingProgress.done} total={loadingProgress.total} />
    {/if}

    {#if errors.length > 0}
      <ErrorsCard {errors} />
    {/if}

    {#if fatture.length > 0 && !loading}
      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <FiltersPanel {filters} {fatture} {activeFilters} onreset={resetFilters} />
        <FattureResults
          {filtrate}
          fattureCount={fatture.length}
          {isDirty}
          currentProjectName={currentProject?.name ?? null}
          onaddfile={processFiles}
          onreset={resetFilters}
          onsave={handleSaveClick}
        />
      </div>
    {/if}

  </div>
</div>

<ProjectsSheet bind:open={projectsOpen} onopen={handleOpenProjectRequest} />
<SettingsSheet
  bind:open={settingsOpen}
  onAiConfigChange={(cfg) => { aiConfig = cfg; }}
/>
<AiSheet
  bind:open={aiOpen}
  {fatture}
  config={aiConfig}
  projectId={currentProject?.id ?? null}
  onrunningChange={(v) => { isAiRunning = v; }}
/>
<SaveProjectDialog bind:open={saveDialogOpen} onsave={handleSaveNewProject} />
<UnsavedDialog
  open={unsavedOpen}
  hasCurrentProject={currentProject !== null}
  saveLabel={unsavedSaveLabel}
  discardLabel={unsavedDiscardLabel}
  onsave={handleUnsavedSave}
  onexecute={handleUnsavedDiscard}
  oncancel={handleUnsavedCancel}
/>
<AiRunningDialog
  bind:open={aiRunningOpen}
  onconfirm={handleAiRunningConfirm}
  oncancel={handleAiRunningCancel}
/>
