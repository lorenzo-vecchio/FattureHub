<script lang="ts">
  import type { ProjectMeta } from '$lib/projects';
  import ProjectListItem from './projects/ProjectListItem.svelte';
  import ProjectsHeader from './projects/ProjectsHeader.svelte';

  let {
    projects,
    onimport,
    onopen,
    ondelete,
  }: {
    projects: ProjectMeta[];
    onimport: () => void;
    onopen: (project: ProjectMeta) => void;
    ondelete?: (id: string) => void;
  } = $props();
</script>

<div class="space-y-6">
  <ProjectsHeader {onimport} />

  <div class="space-y-3">
    {#each projects as project (project.id)}
      <ProjectListItem {project} {onopen} {ondelete} />
    {/each}
  </div>
</div>
