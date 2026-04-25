<script lang="ts">
  import type { Fattura } from '$lib/parser';
  import { downloadZip, downloadZipGrouped } from '$lib/zipper';
  import FatturaDialog from './FatturaDialog.svelte';
  import FattureEmptyState from './FattureEmptyState.svelte';
  import FattureExportDialog from './FattureExportDialog.svelte';
  import FattureResultsToolbar from './FattureResultsToolbar.svelte';
  import FattureTotals from './FattureTotals.svelte';
  import FattureResultsList from './results/FattureResultsList.svelte';

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
    <FattureEmptyState {onreset} />
  {:else}
    <FattureResultsList invoices={filtrate} openInvoice={openDetail} />

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
