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

{#if app.loading || app.openingProject}
  <LoadingCard done={app.loadingProgress.done} total={app.loadingProgress.total} />

{:else if app.projectsList.length === 0}
  <UploadZone onfiles={app.processFiles} />

{:else}
  <ProjectsHomePage
    projects={app.projectsList}
    onimport={() => (app.importDialogOpen = true)}
    onopen={app.handleOpenProjectFromList}
  />
{/if}
