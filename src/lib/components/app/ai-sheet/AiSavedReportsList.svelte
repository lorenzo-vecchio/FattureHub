<script lang="ts">
  import type { Report } from '$lib/ai-reports';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { Trash2 } from 'lucide-svelte';

  let {
    reports,
    openReport,
    removeReport,
    formatDate,
  }: {
    reports: Report[];
    openReport: (report: Report) => void;
    removeReport: (report: Report) => void;
    formatDate: (date: number | string) => string;
  } = $props();
</script>

{#if reports.length === 0}
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
    <p class="text-sm text-muted-foreground">Nessun report salvato per questo progetto.</p>
  </div>
{:else}
  <div class="space-y-px px-3 py-3">
    {#each reports as report (report.id)}
      <div class="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60">
        <div class="min-w-0 flex-1">
          <p class="text-xs text-muted-foreground">{formatDate(report.createdAt)}</p>
          <p class="mt-0.5 text-sm truncate">{report.prompt}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => removeReport(report)} title="Elimina">
            <Trash2 class="h-3.5 w-3.5 text-destructive" />
          </Button>
          <Button size="sm" class="h-7 text-xs" onclick={() => openReport(report)}>
            Apri
          </Button>
        </div>
      </div>
      <Separator class="mx-3" />
    {/each}
  </div>
{/if}
