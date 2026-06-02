<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Download, ChevronLeft, ChevronRight } from 'lucide-svelte';

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

  type ValueKey = 'imponibile' | 'iva' | 'totale';
  const keys: ValueKey[] = ['imponibile', 'iva', 'totale'];
  let activeValue = $state<ValueKey>('totale');

  const labels: Record<ValueKey, string> = {
    imponibile: 'Imponibile',
    iva: 'IVA',
    totale: 'Totale',
  };

  const values: Record<ValueKey, number> = $derived({
    imponibile: totaleImponibile,
    iva: totaleImposta,
    totale: totaleDocumento,
  });

  function prev() {
    const idx = keys.indexOf(activeValue);
    activeValue = keys[(idx - 1 + keys.length) % keys.length];
  }

  function next() {
    const idx = keys.indexOf(activeValue);
    activeValue = keys[(idx + 1) % keys.length];
  }
</script>

<Card.Root class="bg-primary text-primary-foreground sticky bottom-10">
  <Card.Content class="flex flex-wrap items-center justify-between gap-4 py-1">
    <p class="text-sm font-medium">{selectedCount} fatture selezionate</p>
    <div class="flex flex-wrap items-center gap-6">
      <div class="hidden lg:flex gap-6">
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
      </div>
      <div class="lg:hidden flex items-center gap-1">
        <button
          onclick={prev}
          class="p-0.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <div class="text-right min-w-[100px]">
          <p class="text-xs opacity-70">{labels[activeValue]}</p>
          <p class="text-sm font-semibold">{fmt.format(values[activeValue])}</p>
        </div>
        <button
          onclick={next}
          class="p-0.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
      <Button variant="secondary" size="sm" onclick={onopenexport}>
        <Download class="mr-2 h-3.5 w-3.5" />
        {exportLabel}
      </Button>
    </div>
  </Card.Content>
</Card.Root>
