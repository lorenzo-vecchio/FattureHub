<script lang="ts">
  import * as ScrollArea from '$lib/components/ui/scroll-area';
  import { Separator } from '$lib/components/ui/separator';
  import type { ProjectMeta } from '$lib/projects';
  import ProjectsSheetListItem from './ProjectsSheetListItem.svelte';

  let {
    projects,
    openingId,
    removeProject,
    openProject,
  }: {
    projects: ProjectMeta[];
    openingId: string | null;
    removeProject: (id: string) => void;
    openProject: (id: string) => void;
  } = $props();
</script>

<ScrollArea.Root class="flex-1">
  <div class="space-y-px px-3 py-3">
    {#each projects as project (project.id)}
      <ProjectsSheetListItem
        {project}
        opening={openingId === project.id}
        {removeProject}
        {openProject}
      />
      <Separator class="mx-3" />
    {/each}
  </div>
</ScrollArea.Root>
