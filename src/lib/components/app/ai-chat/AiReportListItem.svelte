<script lang="ts">
  import type { Report } from '$lib/ai-reports';
  import { deleteReport } from '$lib/ai-reports';
  import { app } from '$lib/stores/app.svelte';
  import { formatDateWithTime } from '$lib/utils/date';
  import { goto } from '$app/navigation';
  import { FileText, CalendarPlus, Folder, Trash2 } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  let {
    report,
    ondelete,
  }: {
    report: Report;
    ondelete: (report: Report) => void;
  } = $props();

  let hover = $state(false);
  let confirmOpen = $state(false);

  function handleOpen() {
    goto(`/report/${report.id}`);
  }

  function handleDeleteClick() {
    confirmOpen = true;
  }

  function getProjectName(projectId: string): string {
    const meta = app.projectsList.find(p => p.id === projectId);
    return meta?.name ?? 'Progetto sconosciuto';
  }
</script>

<Dialog.Root bind:open={confirmOpen}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="sm:max-w-[400px]">
      <Dialog.Header>
        <Dialog.Title>Elimina report</Dialog.Title>
        <Dialog.Description>
          Eliminare il report "{report.prompt}"? Questa azione non può essere annullata.
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="flex gap-2 justify-end">
        <Button variant="outline" onclick={() => confirmOpen = false}>Annulla</Button>
        <Button variant="destructive" onclick={() => { confirmOpen = false; ondelete(report); }}>Elimina</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<div
  role="button"
  tabindex="-1"
  class="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
  onmouseenter={() => hover = true}
  onmouseleave={() => hover = false}
>
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-3">
      <div class="rounded-full bg-primary/10 p-2">
        <FileText class="h-4 w-4 text-primary" />
      </div>
      <div class="min-w-0">
        <h3 class="truncate font-medium">{report.prompt}</h3>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span class="flex items-center gap-1">
            <CalendarPlus class="h-3 w-3" />
            {formatDateWithTime(report.createdAt)}
          </span>
          <span class="text-muted-foreground/60">&bull;</span>
          <span class="flex items-center gap-1">
            <Folder class="h-3 w-3" />
            {getProjectName(report.projectId)}
          </span>
          <span class="text-muted-foreground/60">&bull;</span>
          <span class="flex items-center gap-1">
            <FileText class="h-3 w-3" />
            {report.blocks.length} blocchi
          </span>
        </div>
      </div>
    </div>
  </div>
  {#if hover}
    <div class="ml-4 flex items-center gap-2">
      <button
        onclick={handleDeleteClick}
        class="rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 class="mr-1 h-4 w-4 inline" />
        Elimina
      </button>
      <button
        onclick={handleOpen}
        class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Apri
      </button>
    </div>
  {/if}
</div>
