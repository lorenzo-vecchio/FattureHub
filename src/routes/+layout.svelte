<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { ModeWatcher } from 'mode-watcher';
  import { onDestroy, onMount } from 'svelte';

  import AppHeader from '$lib/components/app/AppHeader.svelte';
  import AiRunningDialog from '$lib/components/app/AiRunningDialog.svelte';
  import AiSheet from '$lib/components/app/AiSheet.svelte';
  import ErrorsCard from '$lib/components/app/ErrorsCard.svelte';
  import ImportDialog from '$lib/components/app/ImportDialog.svelte';
  import ProjectsSheet from '$lib/components/app/ProjectsSheet.svelte';
  import SaveProjectDialog from '$lib/components/app/SaveProjectDialog.svelte';
  import SettingsSheet from '$lib/components/app/SettingsSheet.svelte';
  import UnsavedDialog from '$lib/components/app/UnsavedDialog.svelte';
  import { app } from '$lib/stores/app.svelte';

  let { children } = $props();

  onMount(() => app.init());
  onDestroy(() => app.destroy());
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<div class="min-h-screen bg-muted/40">
  <AppHeader
    fattureCount={app.fatture.length}
    activeFilters={app.activeFilters}
    isDirty={app.isDirty}
    currentProjectName={app.currentProject?.name ?? null}
    aiEnabled={app.aiConfig.enabled}
    isAiRunning={app.isAiRunning}
    onclear={app.handleClearClick}
    onopenprojects={() => (app.projectsOpen = true)}
    opensettings={() => (app.settingsOpen = true)}
    openai={() => (app.aiOpen = true)}
  />

  <div class="mx-auto max-w-7xl px-6 py-6">
    {#if app.errors.length > 0}
      <ErrorsCard errors={app.errors} />
    {/if}

    {@render children()}
  </div>
</div>

<!-- Global sheets -->
<ProjectsSheet bind:open={app.projectsOpen} onopen={app.handleOpenProjectRequest} />
<SettingsSheet
  bind:open={app.settingsOpen}
  onAiConfigChange={(cfg) => { app.aiConfigWritable = cfg; }}
/>
<AiSheet
  bind:open={app.aiOpen}
  fatture={app.fatture}
  config={app.aiConfig}
  projectId={app.currentProject?.id ?? null}
  onrunningChange={(v) => { app.isAiRunningWritable = v; }}
/>

<!-- Global dialogs -->
<SaveProjectDialog bind:open={app.saveDialogOpen} onsave={app.handleSaveNewProject} />
<UnsavedDialog
  open={app.unsavedOpen}
  hasCurrentProject={app.currentProject !== null}
  saveLabel={app.unsavedSaveLabel}
  discardLabel={app.unsavedDiscardLabel}
  onsave={app.handleUnsavedSave}
  onexecute={app.handleUnsavedDiscard}
  oncancel={app.handleUnsavedCancel}
/>
<AiRunningDialog
  bind:open={app.aiRunningOpen}
  onconfirm={app.handleAiRunningConfirm}
  oncancel={app.handleAiRunningCancel}
/>
<ImportDialog bind:open={app.importDialogOpen} onfiles={app.processFiles} />
