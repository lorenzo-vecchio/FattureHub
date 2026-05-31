<script lang="ts">
  import { goto } from '$app/navigation';
  import LoadingCard from '$lib/components/app/LoadingCard.svelte';
  import ProjectsHomePage from '$lib/components/app/ProjectsHomePage.svelte';
  import UploadZone from '$lib/components/app/UploadZone.svelte';
  import { app } from '$lib/stores/app.svelte';

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
  <ProjectsHomePage
    projects={app.projectsList}
    onimport={() => (app.importDialogOpen = true)}
    onopen={app.handleOpenProjectFromList}
    ondelete={app.handleDeleteProject}
  />
{/if}
