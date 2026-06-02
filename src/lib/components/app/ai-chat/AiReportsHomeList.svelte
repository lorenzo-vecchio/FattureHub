<script lang="ts">
  import type { Report } from '$lib/ai-reports';
  import { loadAllReports } from '$lib/ai-reports';
  import { app } from '$lib/stores/app.svelte';
  import { formatDateWithTime } from '$lib/utils/date';
  import { goto } from '$app/navigation';
  import { Loader, FileText, CalendarPlus, Folder } from 'lucide-svelte';

  let reports = $state<Report[]>([]);
  let loading = $state(true);

  async function load() {
    loading = true;
    reports = await loadAllReports();
    loading = false;
  }

  $effect(() => {
    load();
  });

  function handleOpen(report: Report) {
    goto(`/report/${report.id}`);
  }

  function getProjectName(projectId: string): string {
    const meta = app.projectsList.find(p => p.id === projectId);
    return meta?.name ?? 'Progetto sconosciuto';
  }
</script>

<div class="text-left mb-6">
  <h2 class="text-2xl font-semibold">I tuoi report</h2>
  <p class="mt-1 text-muted-foreground">Scegli un report da visualizzare</p>
</div>

{#if loading}
  <div class="flex items-center justify-center py-16">
    <Loader class="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
{:else if reports.length === 0}
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <FileText class="h-12 w-12 text-muted-foreground/30" />
    <p class="mt-4 text-sm text-muted-foreground">Nessun report salvato.</p>
    <p class="mt-1 text-xs text-muted-foreground/60">Apri un progetto e usa l'Assistente AI per generare report.</p>
  </div>
{:else}
  <div class="space-y-3">
    {#each reports as report (report.id)}
      <div
        role="button"
        tabindex="0"
        onclick={() => handleOpen(report)}
        onkeydown={(e) => { if (e.key === 'Enter') handleOpen(report); }}
        class="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent cursor-pointer"
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
      </div>
    {/each}
  </div>
{/if}
