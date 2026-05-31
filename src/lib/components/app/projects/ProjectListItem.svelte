<script lang="ts">
  import type { ProjectMeta } from '$lib/projects';
  import { formatDate, formatLastOpenedDate } from '$lib/utils/date';
  import { CalendarPlus, Clock, FileText, Folder, Trash2 } from 'lucide-svelte';
  import ConfirmDialog from '../ConfirmDialog.svelte';

  let {
    project,
    onopen,
    ondelete,
  }: {
    project: ProjectMeta;
    onopen: (project: ProjectMeta) => void;
    ondelete?: (id: string) => void;
  } = $props();

  let hover = $state(false);
  let confirmOpen = $state(false);
  let deleting = $state(false);

  async function handleConfirmDelete() {
    confirmOpen = false;
    deleting = true;
    ondelete?.(project.id);
  }
</script>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Elimina progetto"
  message="Sei sicuro di voler eliminare il progetto &ldquo;{project.name}&rdquo;? Le fatture non salvate altrove verranno perse."
  confirmLabel="Elimina"
  cancelLabel="Annulla"
  variant="destructive"
  onconfirm={handleConfirmDelete}
/>

<div
  class="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
  onmouseenter={() => hover = true}
  onmouseleave={() => hover = false}
>
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
  {#if hover}
    <div class="ml-4 flex items-center gap-2">
      {#if ondelete && !deleting}
        <button
          onclick={() => confirmOpen = true}
          class="rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 class="mr-1 h-4 w-4 inline" />
          Elimina
        </button>
      {/if}
      <button
        onclick={() => onopen(project)}
        class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Apri
      </button>
    </div>
  {/if}
</div>
