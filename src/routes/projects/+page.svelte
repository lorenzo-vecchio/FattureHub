<script lang="ts">
  import ProjectsHomePage from '$lib/components/app/ProjectsHomePage.svelte';
  import { app } from '$lib/stores/app.svelte';
</script>

<ProjectsHomePage
  projects={app.projectsList}
  onimport={() => (app.importDialogOpen = true)}
  onopen={app.handleOpenProjectFromList}
  ondelete={app.handleDeleteProject}
/>
