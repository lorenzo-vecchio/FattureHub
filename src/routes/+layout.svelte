<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { ModeWatcher } from 'mode-watcher';
  import { onDestroy, onMount } from 'svelte';

  import AppHeader from '$lib/components/app/AppHeader.svelte';
  import { TooltipProvider } from '$lib/components/ui/tooltip';
  import AiRunningDialog from '$lib/components/app/AiRunningDialog.svelte';
  import ErrorsCard from '$lib/components/app/ErrorsCard.svelte';
  import ImportDialog from '$lib/components/app/ImportDialog.svelte';
  import ProjectsSheet from '$lib/components/app/ProjectsSheet.svelte';
  import SaveProjectDialog from '$lib/components/app/SaveProjectDialog.svelte';
  import SettingsSheet from '$lib/components/app/SettingsSheet.svelte';
  import UnsavedDialog from '$lib/components/app/UnsavedDialog.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';

  let { children } = $props();

  let isAiRoute = $derived($page.url.pathname.startsWith('/ai'));

  // Navigate to workspace when a project is opened from any route
  $effect(() => {
    const path = $page.url.pathname;
    if (path.startsWith('/ai')) return;
    const hasFatture = app.fatture.length > 0;
    const isIdle = !app.loading && !app.openingProject;

    if (hasFatture && isIdle && (path.startsWith('/home') || path === '/')) {
      goto('/workspace');
    }

    if (!hasFatture && isIdle && path === '/workspace') {
      goto('/home');
    }
  });

  onMount(() => app.init());
  onDestroy(() => app.destroy());
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<TooltipProvider>
  <div class="flex h-screen flex-col bg-muted/40">
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
    />

    {#if isAiRoute}
      <div class="flex-1 min-h-0">
        {@render children()}
      </div>
    {:else}
      <div class="mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-6 py-6">
        {#if app.errors.length > 0}
          <ErrorsCard errors={app.errors} />
        {/if}

        {@render children()}
      </div>
    {/if}
  </div>
</TooltipProvider>

<!-- Global sheets -->
<ProjectsSheet bind:open={app.projectsOpen} onopen={app.handleOpenProjectRequest} />
<SettingsSheet
  bind:open={app.settingsOpen}
  onAiConfigChange={(cfg) => { app.aiConfigWritable = cfg; }}
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
