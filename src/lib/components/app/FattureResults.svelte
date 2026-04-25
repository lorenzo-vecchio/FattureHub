<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import type { Fattura } from '$lib/parser';
  import { cedenteLabel } from '$lib/parser';
  import { downloadZip, downloadZipGrouped } from '$lib/zipper';
  import { Funnel, RotateCcw } from 'lucide-svelte';
  import FatturaDialog from './FatturaDialog.svelte';
  import FattureExportDialog from './FattureExportDialog.svelte';
  import FattureResultsToolbar from './FattureResultsToolbar.svelte';
  import FattureTotals from './FattureTotals.svelte';

  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  let { filtrate, fattureCount, isDirty, currentProjectName, onaddfile, onreset, onsave, removeInvoice }: {
    filtrate: Fattura[];
    fattureCount: number;
    isDirty: boolean;
    currentProjectName: string | null;
    onaddfile: (files: File[]) => void;
    onreset: () => void;
    onsave: () => void;
    removeInvoice: (fattura: Fattura) => Promise<void>;
  } = $props();

  let groupBy = $state<'' | 'cedente' | 'cessionario'>('');
  let exportDialogOpen = $state(false);

  let selectedFattura = $state<Fattura | null>(null);
  let dialogOpen = $state(false);

  function openDetail(fat: Fattura) {
    selectedFattura = fat;
    dialogOpen = true;
  }

  let totaleImponibile = $derived(filtrate.reduce((a, f) => a + f.imponibile, 0));
  let totaleImposta = $derived(filtrate.reduce((a, f) => a + f.imposta, 0));
  let totaleDocumento = $derived(filtrate.reduce((a, f) => a + f.importoTotale, 0));

  function handleExport() {
    if (groupBy === '') {
      downloadZip(filtrate);
    } else {
      downloadZipGrouped(filtrate, groupBy);
    }

    exportDialogOpen = false;
  }

  function openExportDialog() {
    if (filtrate.length === 0) return;
    exportDialogOpen = true;
  }

  const groupByLabels = {
    '': 'Flat',
    cedente: 'Per fornitore',
    cessionario: 'Per cliente',
  } as const;
</script>

<section class="space-y-3">
  <FattureResultsToolbar
    resultsCount={filtrate.length}
    {fattureCount}
    {isDirty}
    {currentProjectName}
    {onaddfile}
    {onsave}
    onopenexport={openExportDialog}
  />

  <!-- Lista fatture -->
  {#if filtrate.length === 0}
    <Card.Root>
      <Card.Content class="flex flex-col items-center gap-3 py-16 text-center">
        <Funnel class="h-8 w-8 text-muted-foreground/50" />
        <p class="text-sm text-muted-foreground">Nessuna fattura corrisponde ai filtri selezionati.</p>
        <Button variant="outline" size="sm" onclick={onreset}>
          <RotateCcw class="mr-2 h-3.5 w-3.5" />
          Azzera filtri
        </Button>
      </Card.Content>
    </Card.Root>
  {:else}
    {#each filtrate as fat}
      <Card.Root
        class="transition-colors hover:border-foreground/30 cursor-pointer"
        onclick={() => openDetail(fat)}
      >
        <Card.Content class="flex items-start justify-between gap-4 py-4">
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="outline" class="font-mono text-xs">
                {fat.tipoDocumento || '—'}
              </Badge>
              <span class="text-sm font-medium">{cedenteLabel(fat)}</span>
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-0.5">
              {#if fat.data}
                <span class="text-xs text-muted-foreground">{fat.data}</span>
              {/if}
              {#if fat.numero}
                <span class="text-xs text-muted-foreground">#{fat.numero}</span>
              {/if}
              {#if fat.cedentePiva}
                <span class="text-xs text-muted-foreground">P.IVA {fat.cedentePiva}</span>
              {/if}
              {#if fat.cedenteRegimeFiscale}
                <Badge variant="secondary" class="text-xs h-4">{fat.cedenteRegimeFiscale}</Badge>
              {/if}
            </div>
            <p class="truncate text-xs text-muted-foreground/70">{fat.fileName}</p>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-sm font-semibold">{fmt.format(fat.importoTotale)}</p>
            {#if fat.imposta > 0}
              <p class="text-xs text-muted-foreground">IVA {fmt.format(fat.imposta)}</p>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
      <div class="m-3"></div>
    {/each}

    <FattureTotals
      selectedCount={filtrate.length}
      {totaleImponibile}
      {totaleImposta}
      {totaleDocumento}
      exportLabel={groupBy === '' ? 'Esporta ZIP' : groupByLabels[groupBy]}
      onopenexport={openExportDialog}
    />
  {/if}

</section>

<FattureExportDialog
  bind:open={exportDialogOpen}
  bind:groupBy
  {groupByLabels}
  onexport={handleExport}
/>

<FatturaDialog fattura={selectedFattura} bind:open={dialogOpen} onremove={removeInvoice} />
