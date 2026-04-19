<script lang="ts">
  import { defaultAiConfig, loadAiConfig, type AiConfig } from '$lib/ai-config';
  import { clearAllInvoices, getAllInvoices, getSetting, initializeDatabase, saveInvoice } from '$lib/db-dexie';
  import { applyFilters, countActiveFilters, emptyFilters } from '$lib/filters';
  import { extractXmlFromP7m, parseXml, type Fattura } from '$lib/parser';
  import { loadProject, loadProjectsMeta, saveProject, updateProject, type Project, type ProjectMeta } from '$lib/projects';
  import JSZip from 'jszip';
  import { onDestroy, onMount, tick } from 'svelte';

  import AiRunningDialog from '$lib/components/app/AiRunningDialog.svelte';
  import AiSheet from '$lib/components/app/AiSheet.svelte';
  import AppHeader from '$lib/components/app/AppHeader.svelte';
  import ErrorsCard from '$lib/components/app/ErrorsCard.svelte';
  import FattureResults from '$lib/components/app/FattureResults.svelte';
  import FiltersPanel from '$lib/components/app/FiltersPanel.svelte';
  import LoadingCard from '$lib/components/app/LoadingCard.svelte';
  import ProjectsSheet from '$lib/components/app/ProjectsSheet.svelte';
  import SaveProjectDialog from '$lib/components/app/SaveProjectDialog.svelte';
  import SettingsSheet from '$lib/components/app/SettingsSheet.svelte';
  import UnsavedDialog from '$lib/components/app/UnsavedDialog.svelte';
  import UploadZone from '$lib/components/app/UploadZone.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';

  // Date formatting functions
  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'oggi';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'ieri';
    } else {
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  function formatLastOpenedDate(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      // If opened today, show only hour and minutes
      return date.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // Otherwise show full date
      return formatDate(timestamp);
    }
  }

  // ── Core state ────────────────────────────────────────────────────────────
  let fatture = $state<Fattura[]>([]);
  let filters = $state(emptyFilters());
  let loading = $state(false);
  let loadingProgress = $state({ done: 0, total: 0 });
  let errors = $state<string[]>([]);
  let openingProject = $state(false);

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
  let importDialogOpen = $state(false);
  let projectsList = $state<ProjectMeta[]>([]);
  let loadingProjects = $state(false);

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
      
      // Close import dialog if it was open
      importDialogOpen = false;
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
    // Refresh projects list
    projectsList = await loadProjectsMeta();
  }

  // ── Open project ──────────────────────────────────────────────────────────
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
    if (project) {
      await handleOpenProjectRequest(project);
    }
  }

  async function refreshProjectsList() {
    loadingProjects = true;
    projectsList = await loadProjectsMeta();
    loadingProjects = false;
  }

  async function doOpenProject(project: Project) {
    openingProject = true;
    try {
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
      
      // Update last opened timestamp
      project.lastOpenedAt = Date.now();
      await updateProject(project.id, project.name, project.fatture, project.filters);
      
      // Refresh projects list
      await refreshProjectsList();
    } finally {
      openingProject = false;
    }
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
    // Refresh projects list when returning to projects view
    projectsList = await loadProjectsMeta();
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

    // Load projects list
    loadingProjects = true;
    projectsList = await loadProjectsMeta();
    loadingProjects = false;

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

    {#if fatture.length === 0 && !loading && !openingProject}
      {#if projectsList.length === 0}
        <UploadZone onfiles={processFiles} />
      {:else}
        <!-- Show projects list when no invoices are loaded but projects exist -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="text-left">
              <h2 class="text-2xl font-semibold">I tuoi progetti</h2>
              <p class="mt-1 text-muted-foreground">
                Scegli un progetto da aprire
              </p>
            </div>
            <button
              onclick={() => importDialogOpen = true}
              class="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Importa nuove fatture
            </button>
          </div>
          
          <div class="space-y-3">
            {#each projectsList as project (project.id)}
              <div class="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-3">
                    <div class="rounded-full bg-primary/10 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder text-primary">
                        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <h3 class="truncate font-medium">{project.name}</h3>
                      <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span class="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text">
                            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                            <path d="M10 9H8"/>
                            <path d="M16 13H8"/>
                            <path d="M16 17H8"/>
                          </svg>
                          {project.count} {project.count === 1 ? 'fattura' : 'fatture'}
                        </span>
                        <span class="text-muted-foreground/60">•</span>
                        <span class="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-plus">
                            <path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/>
                            <line x1="16" x2="16" y1="2" y2="6"/>
                            <line x1="8" x2="8" y1="2" y2="6"/>
                            <line x1="3" x2="21" y1="10" y2="10"/>
                            <line x1="19" x2="19" y1="16" y2="22"/>
                            <line x1="16" x2="22" y1="19" y2="19"/>
                          </svg>
                          Creato: {formatDate(project.savedAt)}
                        </span>
                        {#if project.lastOpenedAt}
                          <span class="text-muted-foreground/60">•</span>
                          <span class="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            Aperto: {formatLastOpenedDate(project.lastOpenedAt)}
                          </span>
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onclick={() => handleOpenProjectFromList(project)}
                  class="ml-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 opacity-0 group-hover:opacity-100"
                >
                  Apri
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    {#if loading || openingProject}
      <LoadingCard done={loadingProgress.done} total={loadingProgress.total} />
    {/if}

    {#if errors.length > 0}
      <ErrorsCard {errors} />
    {/if}

    {#if fatture.length > 0 && !loading && !openingProject}
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

<!-- Import Dialog -->
<Dialog.Root bind:open={importDialogOpen}>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Importa fatture</Dialog.Title>
      <Dialog.Description>
        Carica file .xml, .p7m (XML firmato) o archivi .zip contenenti fatture FatturaPA
      </Dialog.Description>
    </Dialog.Header>
    <div class="py-4">
      <UploadZone onfiles={processFiles} />
    </div>
    <Dialog.Footer>
      <Dialog.Close>
        <Button variant="outline">Annulla</Button>
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
