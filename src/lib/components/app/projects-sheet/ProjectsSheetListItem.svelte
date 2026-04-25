<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import type { ProjectMeta } from '$lib/projects';
  import { formatDateWithTime } from '$lib/utils/date';
  import { Loader, Trash2 } from 'lucide-svelte';

  let {
    project,
    opening,
    removeProject,
    openProject,
  }: {
    project: ProjectMeta;
    opening: boolean;
    removeProject: (id: string) => void;
    openProject: (id: string) => void;
  } = $props();
</script>

<div class="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60">
  <div class="min-w-0 flex-1">
    <p class="truncate text-sm font-medium">{project.name}</p>
    <div class="mt-1 flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary" class="h-4 text-xs">
        {project.count} {project.count === 1 ? 'fattura' : 'fatture'}
      </Badge>
      <span class="text-xs text-muted-foreground">
        Creato: {formatDateWithTime(project.savedAt)}
      </span>
      {#if project.lastOpenedAt}
        <span class="text-xs text-muted-foreground">
          • Aperto: {formatDateWithTime(project.lastOpenedAt)}
        </span>
      {/if}
    </div>
  </div>
  <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
    <Button
      variant="ghost"
      size="icon"
      class="h-7 w-7"
      onclick={() => removeProject(project.id)}
      title="Elimina"
    >
      <Trash2 class="h-3.5 w-3.5 text-destructive" />
    </Button>
    <Button
      size="sm"
      class="h-7 text-xs"
      disabled={opening}
      onclick={() => openProject(project.id)}
    >
      {#if opening}
        <Loader class="mr-1.5 h-3 w-3 animate-spin" />
      {/if}
      Apri
    </Button>
  </div>
</div>
