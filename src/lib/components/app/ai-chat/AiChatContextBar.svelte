<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import * as Popover from '$lib/components/ui/popover';
  import { Input } from '$lib/components/ui/input';
  import { app } from '$lib/stores/app.svelte';
  import { FolderArchive, Plus, X } from 'lucide-svelte';
  import type { ProjectMeta } from '$lib/projects';

  let {
    contextProjects,
    onadd,
    onremove,
  }: {
    contextProjects: ProjectMeta[];
    onadd: (project: ProjectMeta) => void;
    onremove: (id: string) => void;
  } = $props();

  let popoverOpen = $state(false);
  let searchQuery = $state('');

  let availableProjects = $derived(
    app.projectsList.filter((p) => !contextProjects.some((cp) => cp.id === p.id))
  );

  let filteredProjects = $derived(
    searchQuery.trim()
      ? availableProjects.filter((p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : availableProjects
  );

  function selectProject(p: ProjectMeta) {
    onadd(p);
    popoverOpen = false;
    searchQuery = '';
  }

  function handleOpenChange(v: boolean) {
    popoverOpen = v;
    if (!v) searchQuery = '';
  }
</script>

<div class="flex flex-wrap items-center gap-1.5 border-b bg-muted/20 px-4 py-2 min-h-[2.5rem]">
  {#each contextProjects as project (project.id)}
    <Badge variant="secondary" class="gap-1 pr-1 text-xs">
      <FolderArchive class="h-3 w-3" />
      {project.name}
      <button
        onclick={() => onremove(project.id)}
        class="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
        title="Rimuovi dal contesto"
      >
        <X class="h-3 w-3" />
      </button>
    </Badge>
  {/each}

  {#if availableProjects.length > 0}
    <Popover.Root bind:open={popoverOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger>
        <Button variant="ghost" size="sm" class="h-6 text-xs gap-1 px-2">
          <Plus class="h-3 w-3" />
          Progetto
        </Button>
      </Popover.Trigger>
      <Popover.Content class="w-64 p-2" align="start">
        <div class="space-y-2">
          <Input
            placeholder="Cerca progetto..."
            value={searchQuery}
            oninput={(e) => (searchQuery = (e.target as HTMLInputElement).value)}
            class="h-8 text-xs"
          />
          <div class="max-h-48 overflow-y-auto space-y-0.5">
            {#if filteredProjects.length === 0}
              <p class="py-4 text-center text-xs text-muted-foreground">
                Nessun progetto trovato
              </p>
            {:else}
              {#each filteredProjects as project (project.id)}
                <button
                  onclick={() => selectProject(project)}
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left"
                >
                  <FolderArchive class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span class="truncate">{project.name}</span>
                  <span class="ml-auto text-muted-foreground">{project.count}</span>
                </button>
              {/each}
            {/if}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  {:else if contextProjects.length === 0}
    <span class="text-xs text-muted-foreground">
      Nessun progetto disponibile.
    </span>
  {/if}
</div>
