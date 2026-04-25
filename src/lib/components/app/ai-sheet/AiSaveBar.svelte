<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Download, Save } from 'lucide-svelte';

  let {
    saveReport,
    exportDocx,
  }: {
    saveReport: () => void;
    exportDocx: () => void;
  } = $props();
</script>

<div class="shrink-0 border-t bg-background px-6 py-3 flex gap-2">
  <Button variant="outline" class="flex-1" onclick={saveReport}>
    <Save class="mr-2 h-4 w-4" />
    Salva report
  </Button>
  <Button variant="outline" onclick={exportDocx} title="Esporta DOCX">
    <Download class="mr-2 h-4 w-4" />
    Scarica DOCX
  </Button>
</div>
