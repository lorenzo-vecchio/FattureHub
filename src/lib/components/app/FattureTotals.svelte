<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Download } from 'lucide-svelte';

  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  let {
    selectedCount,
    totaleImponibile,
    totaleImposta,
    totaleDocumento,
    exportLabel,
    onopenexport,
  }: {
    selectedCount: number;
    totaleImponibile: number;
    totaleImposta: number;
    totaleDocumento: number;
    exportLabel: string;
    onopenexport: () => void;
  } = $props();
</script>

<Card.Root class="bg-primary text-primary-foreground sticky bottom-10">
  <Card.Content class="flex flex-wrap items-center justify-between gap-4 py-1">
    <p class="text-sm font-medium">{selectedCount} fatture selezionate</p>
    <div class="flex flex-wrap gap-6">
      <div class="text-right">
        <p class="text-xs opacity-70">Imponibile</p>
        <p class="text-sm font-semibold">{fmt.format(totaleImponibile)}</p>
      </div>
      <div class="text-right">
        <p class="text-xs opacity-70">IVA</p>
        <p class="text-sm font-semibold">{fmt.format(totaleImposta)}</p>
      </div>
      <div class="text-right">
        <p class="text-xs opacity-70">Totale</p>
        <p class="text-sm font-semibold">{fmt.format(totaleDocumento)}</p>
      </div>
      <Button variant="secondary" size="sm" onclick={onopenexport}>
        <Download class="mr-2 h-3.5 w-3.5" />
        {exportLabel}
      </Button>
    </div>
  </Card.Content>
</Card.Root>
