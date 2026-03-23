<script lang="ts">
  import { tick, onMount, onDestroy } from 'svelte';
  import { parseXml, type Fattura } from '$lib/parser';
  import { applyFilters, emptyFilters, countActiveFilters } from '$lib/filters';
  import { saveProject, updateProject, type Project } from '$lib/projects';
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

  // Sync macOS close button dot (•) with dirty state
  $effect(() => {
    const dirty = isDirty;
    import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke('set_document_edited', { edited: dirty }))
      .catch(() => {});
  });

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

  async function processFiles(files: File[]) {
    loading = true;
    errors = [];
    const xmlFiles: { name: string; text: string }[] = [];

    for (const file of files) {
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        for (const [path, entry] of Object.entries(zip.files)) {
          if (!entry.dir && path.toLowerCase().endsWith('.xml') && !isMacMeta(path)) {
            const text = await entry.async('string');
            xmlFiles.push({ name: path.split('/').pop() ?? path, text });
          }
        }
      } else if (file.name.toLowerCase().endsWith('.xml') && !isMacMeta(file.name)) {
        xmlFiles.push({ name: file.name, text: await file.text() });
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

    fatture = [...fatture, ...parsed];
    loading = false;
  }

  // ── Save logic ────────────────────────────────────────────────────────────
  /** Called from the toolbar Save button */
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

  /** Called from SaveProjectDialog (new project name confirmed) */
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
    fatture = project.fatture;
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

  function doClearAll() {
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
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      unlistenClose = await getCurrentWindow().onCloseRequested((event) => {
        if (!isDirty) return;
        event.preventDefault();
        pendingAction = { type: 'close' };
        unsavedOpen = true;
      });
    } catch {
      // Not running in Tauri (e.g. browser dev mode) — ignore
    }
  });

  onDestroy(() => unlistenClose?.());
</script>

<div class="min-h-screen bg-muted/40">
  <AppHeader
    fattureCount={fatture.length}
    {activeFilters}
    {isDirty}
    currentProjectName={currentProject?.name ?? null}
    onclear={handleClearClick}
    onopenprojects={() => (projectsOpen = true)}
    opensettings={() => (settingsOpen = true)}
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
<SettingsSheet bind:open={settingsOpen} />
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
