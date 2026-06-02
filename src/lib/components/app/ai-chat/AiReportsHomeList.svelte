<script lang="ts">
  import type { Report } from '$lib/ai-reports';
  import { loadAllReports, deleteReport } from '$lib/ai-reports';
  import { Loader, FileText } from 'lucide-svelte';
  import AiReportListItem from './AiReportListItem.svelte';

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

  async function handleDelete(report: Report) {
    await deleteReport(report.projectId, report.id);
    reports = reports.filter(r => r.id !== report.id);
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
      <AiReportListItem {report} ondelete={handleDelete} />
    {/each}
  </div>
{/if}
