<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import * as Dialog from '$lib/components/ui/dialog';
  import type { Fattura } from '$lib/parser';
  import { cedenteLabel } from '$lib/parser';
  import { downloadZip, downloadZipGrouped } from '$lib/zipper';
  import { Download, FolderOpen, Funnel, RotateCcw, Save, Upload } from 'lucide-svelte';
  import FatturaDialog from './FatturaDialog.svelte';

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

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) onaddfile(Array.from(input.files));
    input.value = '';
  }

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

  <!-- Toolbar -->
  <div class="flex flex-wrap items-center justify-between gap-2 mb-5">
    <p class="text-sm text-muted-foreground">
      <span class="font-medium text-foreground">{filtrate.length}</span> risultati su {fattureCount}
    </p>

    <div class="flex flex-wrap items-center gap-2">

      <!-- Aggiungi file -->
      <Button variant="outline" size="sm">
        <label class="cursor-pointer flex flex-row">
          <Upload class="mr-2 h-3.5 w-3.5" />
          Aggiungi file
          <input type="file" class="sr-only" multiple accept=".xml,.zip" onchange={handleFileInput} />
        </label>
      </Button>

      <!-- Salva progetto -->
      <Button variant={isDirty && currentProjectName ? 'default' : 'outline'} size="sm" onclick={onsave}>
        {#if isDirty && currentProjectName}
          <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"></span>
        {:else}
          <Save class="mr-2 h-3.5 w-3.5" />
        {/if}
        {currentProjectName ? 'Salva' : 'Salva progetto'}
      </Button>

      <!-- Esporta ZIP -->
      <Button size="sm" disabled={filtrate.length === 0} onclick={openExportDialog}>
        <Download class="mr-2 h-3.5 w-3.5" />
        Esporta ZIP ({filtrate.length})
      </Button>

    </div>
  </div>

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

    <!-- Totali -->
    <Card.Root class="bg-primary text-primary-foreground sticky bottom-10">
      <Card.Content class="flex flex-wrap items-center justify-between gap-4 py-4">
        <p class="text-sm font-medium">{filtrate.length} fatture selezionate</p>
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
          <Button variant="secondary" size="sm" onclick={openExportDialog}>
            <Download class="mr-2 h-3.5 w-3.5" />
            {groupBy === '' ? 'Esporta ZIP' : groupByLabels[groupBy]}
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

</section>

<Dialog.Root bind:open={exportDialogOpen}>
  <Dialog.Content class="sm:max-w-115">
    <Dialog.Header>
      <Dialog.Title>Esporta ZIP</Dialog.Title>
      <Dialog.Description>
        Scegli come organizzare i file da esportare.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-3 py-2">
      <p class="text-xs text-muted-foreground">Modalita export</p>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {#each Object.entries(groupByLabels) as [v, l]}
          <Button
            variant={groupBy === v ? 'default' : 'outline'}
            size="sm"
            class="justify-start"
            onclick={() => (groupBy = v as '' | 'cedente' | 'cessionario')}
          >
            {#if v === ''}
              <Download class="mr-2 h-3.5 w-3.5" />
            {:else}
              <FolderOpen class="mr-2 h-3.5 w-3.5" />
            {/if}
            {l}
          </Button>
        {/each}
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (exportDialogOpen = false)}>Annulla</Button>
      <Button onclick={handleExport}>
        <Download class="mr-2 h-3.5 w-3.5" />
        {groupBy === '' ? 'Esporta ZIP' : groupByLabels[groupBy]}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<FatturaDialog fattura={selectedFattura} bind:open={dialogOpen} onremove={removeInvoice} />
