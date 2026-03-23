<script lang="ts">
  import { loadProjectsMeta, loadProject, deleteProject, type ProjectMeta } from '$lib/projects';
  import * as Sheet from '$lib/components/ui/sheet';
  import * as ScrollArea from '$lib/components/ui/scroll-area';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Separator } from '$lib/components/ui/separator';
  import { FolderOpen, Trash2, FolderArchive, Loader } from 'lucide-svelte';
  import type { Project } from '$lib/projects';

  let { open = $bindable(false), onopen }: {
    open: boolean;
    onopen: (project: Project) => void;
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

  const fmt = new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  async function handleOpen(id: string) {
    openingId = id;
    const project = await loadProject(id);
    openingId = null;
    if (project) {
      onopen(project);
      open = false;
    }
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
      <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <FolderOpen class="h-10 w-10 text-muted-foreground/40" />
        <p class="text-sm text-muted-foreground">Nessun progetto salvato.</p>
        <p class="text-xs text-muted-foreground/70">
          Carica delle fatture e usa il pulsante <strong>Salva</strong> per creare un progetto.
        </p>
      </div>
    {:else}
      <ScrollArea.Root class="flex-1">
        <div class="space-y-px px-3 py-3">
          {#each projects as project (project.id)}
            <div class="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{project.name}</p>
                <div class="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" class="h-4 text-xs">
                    {project.count} fatture
                  </Badge>
                  <span class="text-xs text-muted-foreground">
                    {fmt.format(new Date(project.savedAt))}
                  </span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7"
                  onclick={() => handleDelete(project.id)}
                  title="Elimina"
                >
                  <Trash2 class="h-3.5 w-3.5 text-destructive" />
                </Button>
                <Button
                  size="sm"
                  class="h-7 text-xs"
                  disabled={openingId === project.id}
                  onclick={() => handleOpen(project.id)}
                >
                  {#if openingId === project.id}
                    <Loader class="mr-1.5 h-3 w-3 animate-spin" />
                  {/if}
                  Apri
                </Button>
              </div>
            </div>
            <Separator class="mx-3" />
          {/each}
        </div>
      </ScrollArea.Root>
    {/if}
  </Sheet.Content>
</Sheet.Root>
