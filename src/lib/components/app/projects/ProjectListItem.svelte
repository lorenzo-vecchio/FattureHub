<script lang="ts">
  import type { ProjectMeta } from '$lib/projects';
  import { formatDate, formatLastOpenedDate } from '$lib/utils/date';
  import { CalendarPlus, Clock, FileText, Folder } from 'lucide-svelte';

  let {
    project,
    onopen,
  }: {
    project: ProjectMeta;
    onopen: (project: ProjectMeta) => void;
  } = $props();
</script>

<div class="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-3">
      <div class="rounded-full bg-primary/10 p-2">
        <Folder class="h-4 w-4 text-primary" />
      </div>
      <div class="min-w-0">
        <h3 class="truncate font-medium">{project.name}</h3>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span class="flex items-center gap-1">
            <FileText class="h-3 w-3" />
            {project.count}
            {project.count === 1 ? 'fattura' : 'fatture'}
          </span>
          <span class="text-muted-foreground/60">•</span>
          <span class="flex items-center gap-1">
            <CalendarPlus class="h-3 w-3" />
            Creato: {formatDate(project.savedAt)}
          </span>
          {#if project.lastOpenedAt}
            <span class="text-muted-foreground/60">•</span>
            <span class="flex items-center gap-1">
              <Clock class="h-3 w-3" />
              Aperto: {formatLastOpenedDate(project.lastOpenedAt)}
            </span>
          {/if}
        </div>
      </div>
    </div>
  </div>
  <button
    onclick={() => onopen(project)}
    class="ml-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 opacity-0 group-hover:opacity-100"
  >
    Apri
  </button>
</div>
