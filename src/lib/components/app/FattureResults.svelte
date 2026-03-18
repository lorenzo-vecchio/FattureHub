<script lang="ts">
  import type { Fattura } from '$lib/parser';
  import { cedenteLabel } from '$lib/parser';
  import { downloadZip } from '$lib/zipper';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
  import { Upload, Download, Funnel, RotateCcw } from 'lucide-svelte';

  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  let { filtrate, fattureCount, onaddfile, onreset }: {
    filtrate: Fattura[];
    fattureCount: number;
    onaddfile: (files: File[]) => void;
    onreset: () => void;
  } = $props();

  let totaleImponibile = $derived(filtrate.reduce((a, f) => a + f.imponibile, 0));
  let totaleImposta = $derived(filtrate.reduce((a, f) => a + f.imposta, 0));
  let totaleDocumento = $derived(filtrate.reduce((a, f) => a + f.importoTotale, 0));

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) onaddfile(Array.from(input.files));
    input.value = '';
  }
</script>

<section class="space-y-3">

  <!-- Toolbar risultati -->
  <div class="flex items-center justify-between">
    <p class="text-sm text-muted-foreground">
      <span class="font-medium text-foreground">{filtrate.length}</span> risultati su {fattureCount}
    </p>
    <div class="flex gap-2">
      <Button variant="outline" size="sm">
        <label class="cursor-pointer flex flex-row">
          <Upload class="mr-2 h-3.5 w-3.5" />
          Aggiungi file
          <input type="file" class="sr-only" multiple accept=".xml,.zip" onchange={handleFileInput} />
        </label>
      </Button>
      <Button
        size="sm"
        disabled={filtrate.length === 0}
        onclick={() => downloadZip(filtrate)}
      >
        <Download class="mr-2 h-3.5 w-3.5" />
        Scarica ZIP ({filtrate.length})
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
      <Card.Root class="transition-colors hover:border-foreground/30">
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
      <div class="m-10"></div>
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
          <Button variant="secondary" size="sm" onclick={() => downloadZip(filtrate)}>
            <Download class="mr-2 h-3.5 w-3.5" />
            Scarica ZIP
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

</section>
