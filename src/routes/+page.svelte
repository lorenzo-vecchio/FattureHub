<script lang="ts">
  import { goto } from '$app/navigation';
  import LoadingCard from '$lib/components/app/LoadingCard.svelte';
  import ProjectsHomePage from '$lib/components/app/ProjectsHomePage.svelte';
  import AiReportsHomeList from '$lib/components/app/ai-chat/AiReportsHomeList.svelte';
  import UploadZone from '$lib/components/app/UploadZone.svelte';
  import { app } from '$lib/stores/app.svelte';

  type Tab = 'projects' | 'reports';
  let tab = $state<Tab>('projects');

  // Navigate to workspace once invoices are ready.
  $effect(() => {
    if (app.fatture.length > 0 && !app.loading && !app.openingProject) {
      goto('/workspace');
    }
  });
</script>

{#if app.openingProject}
  <div class="flex items-center justify-center py-16">
    <div class="text-center">
      <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      <p class="text-sm text-muted-foreground">Caricamento progetto in corso...</p>
    </div>
  </div>

{:else if app.loading}
  <LoadingCard
    parsingDone={app.loadingProgress.parsingDone}
    parsingTotal={app.loadingProgress.parsingTotal}
    savingDone={app.loadingProgress.savingDone}
    savingTotal={app.loadingProgress.savingTotal}
    stage={app.loadingProgress.stage}
  />

{:else if app.projectsList.length === 0}
  <UploadZone onfiles={app.processFiles} />

{:else}
  <div class="space-y-6">
    <div class="inline-flex items-center rounded-lg bg-muted p-1">
      <button
        onclick={() => (tab = 'projects')}
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {tab === 'projects' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
      >
        Progetti
      </button>
      <button
        onclick={() => (tab = 'reports')}
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {tab === 'reports' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
      >
        Report
      </button>
    </div>

    {#if tab === 'projects'}
      <ProjectsHomePage
        projects={app.projectsList}
        onimport={() => (app.importDialogOpen = true)}
        onopen={app.handleOpenProjectFromList}
        ondelete={app.handleDeleteProject}
      />
    {:else}
      <AiReportsHomeList />
    {/if}
  </div>
{/if}
