<script lang="ts">
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import ReportView from '../ReportView.svelte';
  import type { Report } from '$lib/ai-reports';

  let {
    report,
  }: {
    report: Report | null;
  } = $props();
</script>

<div class="flex h-full flex-col bg-background">
  {#if report}
    <ScrollArea class="h-full">
      <div class="px-4 py-4">
        <ReportView {report} />
      </div>
    </ScrollArea>
  {:else}
    <div class="flex h-full items-center justify-center">
      <div class="text-center px-6">
        <p class="text-sm text-muted-foreground">
          Genera un report per vederlo qui.
        </p>
      </div>
    </div>
  {/if}
</div>
