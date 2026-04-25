<script lang="ts">
  import * as Sheet from '$lib/components/ui/sheet';
  import type { Project } from '$lib/projects';
  import { deleteProject, loadProject, loadProjectsMeta, type ProjectMeta } from '$lib/projects';
  import { FolderArchive, Loader } from 'lucide-svelte';
  import ProjectsSheetEmptyState from './projects-sheet/ProjectsSheetEmptyState.svelte';
  import ProjectsSheetList from './projects-sheet/ProjectsSheetList.svelte';

  let { open = $bindable(false), onopen }: {
    open: boolean;
    onopen: (project: Project) => Promise<void> | void;
  } = $props();

  let projects = $state<ProjectMeta[]>([]);
  let loading = $state(false);
  let openingId = $state<string | null>(null);

  function handleOpenChange(v: boolean) {
    open = v;
  }

  async function refresh() {
    loading = true;
    projects = await loadProjectsMeta();
    loading = false;
  }

  $effect(() => {
    if (open) {
      void refresh();
    }
  });


  async function handleOpen(id: string) {
    openingId = id;
    const project = await loadProject(id);
    if (project) {
      await onopen(project);
    }
    openingId = null;
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    projects = projects.filter(p => p.id !== id);
  }
</script>

<Sheet.Root open={open} onOpenChange={handleOpenChange}>
  <Sheet.Content side="right" class="flex w-[360px] flex-col gap-0 p-0 sm:max-w-[360px]">
    <Sheet.Header class="border-b px-6 py-4">
      <Sheet.Title class="flex items-center gap-2">
        <FolderArchive class="h-4 w-4" />
        Progetti salvati
      </Sheet.Title>
      <Sheet.Description>
        {projects.length} {projects.length === 1 ? 'progetto' : 'progetti'}
      </Sheet.Description>
    </Sheet.Header>

    {#if loading}
      <div class="flex flex-1 items-center justify-center py-16">
        <Loader class="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    {:else if projects.length === 0}
      <ProjectsSheetEmptyState />
    {:else}
      <ProjectsSheetList
        {projects}
        {openingId}
        removeProject={handleDelete}
        openProject={handleOpen}
      />
    {/if}
  </Sheet.Content>
</Sheet.Root>
