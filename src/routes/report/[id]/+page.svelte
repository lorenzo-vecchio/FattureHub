<script lang="ts">
  import { loadReportById, type Report } from '$lib/ai-reports';
  import { exportReportToDocx } from '$lib/export-docx';
  import { Button } from '$lib/components/ui/button';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { ArrowLeft, Download, Sparkles } from 'lucide-svelte';
  import ReportView from '$lib/components/app/ReportView.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let report = $state<Report | null>(null);
  let loading = $state(true);

  $effect(() => {
    const id = $page.params.id;
    if (id) {
      loadReportById(id).then(r => {
        report = r;
        loading = false;
      });
    }
  });
</script>

<div class="flex flex-col h-full -mt-6 -mx-6">
  <div class="flex items-center justify-between border-b px-6 py-3 shrink-0">
    <div class="flex items-center gap-3">
      <button
        onclick={() => goto('/home/report')}
        class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Indietro"
      >
        <ArrowLeft class="h-4 w-4" />
      </button>
      <div class="min-w-0">
        <h1 class="text-sm font-semibold truncate max-w-md">{report?.prompt ?? 'Report'}</h1>
        {#if report}
          <p class="text-xs text-muted-foreground">
            {new Date(report.createdAt).toLocaleString('it-IT')}
          </p>
        {/if}
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Button size="sm" variant="outline" class="h-8 text-xs" onclick={() => { report && exportReportToDocx(report); }}>
        <Download class="mr-1 h-3.5 w-3.5" />
        Scarica DOCX
      </Button>
      <Button size="sm" class="h-8 text-xs" onclick={() => goto('/home/report')}>
        <Sparkles class="mr-1 h-3.5 w-3.5" />
        Apri con AI
      </Button>
    </div>
  </div>

  <div class="flex-1 min-h-0 overflow-hidden">
    {#if loading}
      <div class="flex items-center justify-center py-16">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    {:else if !report}
      <div class="flex items-center justify-center py-16">
        <p class="text-sm text-muted-foreground">Report non trovato.</p>
      </div>
    {:else}
      <ScrollArea class="h-full">
        <div class="mx-auto max-w-4xl px-6 py-6">
          <ReportView {report} />
        </div>
      </ScrollArea>
    {/if}
  </div>
</div>
