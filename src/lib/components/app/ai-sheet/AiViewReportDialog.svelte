<script lang="ts">
  import type { Report } from '$lib/ai-reports';
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Download } from 'lucide-svelte';
  import ReportView from '../ReportView.svelte';

  let {
    report,
    close,
    exportDocx,
  }: {
    report: Report | null;
    close: () => void;
    exportDocx: () => void;
  } = $props();
</script>

{#if report}
  <Dialog.Root open={report !== null} onOpenChange={(v) => { if (!v) close(); }}>
    <Dialog.Portal>
      <Dialog.Overlay />
      <Dialog.Content class="sm:max-w-[700px] max-h-[85vh] flex flex-col gap-0 p-0">
        <Dialog.Header class="shrink-0 px-6 py-4 border-b flex items-center justify-between">
          <Dialog.Title>Report</Dialog.Title>
          <Button variant="ghost" onclick={exportDocx} title="Esporta DOCX">
            <Download class="mr-2 h-4 w-4" />
            Scarica DOCX
          </Button>
        </Dialog.Header>
        <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <ReportView report={report} />
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
{/if}
