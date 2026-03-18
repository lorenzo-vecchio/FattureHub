<script lang="ts">
  import type { Fattura } from '$lib/parser';
  import { cedenteLabel, cessionarioLabel } from '$lib/parser';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { Download, Building2, User, FileText, ArrowLeftRight } from 'lucide-svelte';

  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  let { fattura, open = $bindable(false) }: {
    fattura: Fattura | null;
    open: boolean;
  } = $props();

  function downloadXml() {
    if (!fattura) return;
    const blob = new Blob([fattura.rawXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fattura.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-2xl">

    {#if fattura}

      <Dialog.Header>
        <Dialog.Title class="flex flex-wrap items-center gap-2 text-base">
          <Badge variant="outline" class="font-mono">{fattura.tipoDocumento || '—'}</Badge>
          <span>{cedenteLabel(fattura)}</span>
        </Dialog.Title>
        <Dialog.Description class="text-xs text-muted-foreground truncate">
          {fattura.fileName}
        </Dialog.Description>
      </Dialog.Header>

      <div class="overflow-y-auto max-h-[60vh] space-y-5 pr-1">

        <!-- Dati documento -->
        <section class="space-y-2">
          <h3 class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText class="h-3.5 w-3.5" />
            Documento
          </h3>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {#if fattura.numero}
              <div>
                <dt class="text-xs text-muted-foreground">Numero</dt>
                <dd class="text-sm font-medium">{fattura.numero}</dd>
              </div>
            {/if}
            {#if fattura.data}
              <div>
                <dt class="text-xs text-muted-foreground">Data</dt>
                <dd class="text-sm font-medium">{fattura.data}</dd>
              </div>
            {/if}
            {#if fattura.valuta}
              <div>
                <dt class="text-xs text-muted-foreground">Valuta</dt>
                <dd class="text-sm font-medium">{fattura.valuta}</dd>
              </div>
            {/if}
          </dl>
        </section>

        <Separator />

        <!-- Importi -->
        <section class="space-y-2">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importi</h3>
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-lg bg-muted/50 p-3 text-center">
              <p class="text-xs text-muted-foreground mb-1">Imponibile</p>
              <p class="text-sm font-semibold">{fmt.format(fattura.imponibile)}</p>
            </div>
            <div class="rounded-lg bg-muted/50 p-3 text-center">
              <p class="text-xs text-muted-foreground mb-1">IVA</p>
              <p class="text-sm font-semibold">{fmt.format(fattura.imposta)}</p>
            </div>
            <div class="rounded-lg bg-primary/10 p-3 text-center">
              <p class="text-xs text-muted-foreground mb-1">Totale</p>
              <p class="text-sm font-bold">{fmt.format(fattura.importoTotale)}</p>
            </div>
          </div>
        </section>

        <Separator />

        <!-- Cedente -->
        <section class="space-y-2">
          <h3 class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 class="h-3.5 w-3.5" />
            Fornitore (Cedente)
          </h3>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <div class="col-span-2 sm:col-span-3">
              <dt class="text-xs text-muted-foreground">Denominazione</dt>
              <dd class="text-sm font-medium">{cedenteLabel(fattura)}</dd>
            </div>
            {#if fattura.cedentePiva}
              <div>
                <dt class="text-xs text-muted-foreground">P.IVA</dt>
                <dd class="text-sm font-mono">{fattura.cedentePiva}</dd>
              </div>
            {/if}
            {#if fattura.cedenteCodFiscale}
              <div>
                <dt class="text-xs text-muted-foreground">Cod. Fiscale</dt>
                <dd class="text-sm font-mono">{fattura.cedenteCodFiscale}</dd>
              </div>
            {/if}
            {#if fattura.cedenteRegimeFiscale}
              <div>
                <dt class="text-xs text-muted-foreground">Regime fiscale</dt>
                <dd><Badge variant="secondary" class="text-xs">{fattura.cedenteRegimeFiscale}</Badge></dd>
              </div>
            {/if}
          </dl>
        </section>

        <Separator />

        <!-- Cessionario -->
        <section class="space-y-2">
          <h3 class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <User class="h-3.5 w-3.5" />
            Cliente (Cessionario)
          </h3>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <div class="col-span-2 sm:col-span-3">
              <dt class="text-xs text-muted-foreground">Denominazione</dt>
              <dd class="text-sm font-medium">{cessionarioLabel(fattura)}</dd>
            </div>
            {#if fattura.cessionarioPiva}
              <div>
                <dt class="text-xs text-muted-foreground">P.IVA</dt>
                <dd class="text-sm font-mono">{fattura.cessionarioPiva}</dd>
              </div>
            {/if}
            {#if fattura.cessionarioCodFiscale}
              <div>
                <dt class="text-xs text-muted-foreground">Cod. Fiscale</dt>
                <dd class="text-sm font-mono">{fattura.cessionarioCodFiscale}</dd>
              </div>
            {/if}
          </dl>
        </section>

        <!-- Trasmissione -->
        {#if fattura.formatoTrasmissione || fattura.progressivoInvio || fattura.codiceDestinatario || fattura.pecDestinatario}
          <Separator />
          <section class="space-y-2">
            <h3 class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ArrowLeftRight class="h-3.5 w-3.5" />
              Trasmissione
            </h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
              {#if fattura.formatoTrasmissione}
                <div>
                  <dt class="text-xs text-muted-foreground">Formato</dt>
                  <dd class="text-sm font-mono">{fattura.formatoTrasmissione}</dd>
                </div>
              {/if}
              {#if fattura.progressivoInvio}
                <div>
                  <dt class="text-xs text-muted-foreground">Progressivo</dt>
                  <dd class="text-sm font-mono">{fattura.progressivoInvio}</dd>
                </div>
              {/if}
              {#if fattura.codiceDestinatario}
                <div>
                  <dt class="text-xs text-muted-foreground">Codice SDI</dt>
                  <dd class="text-sm font-mono">{fattura.codiceDestinatario}</dd>
                </div>
              {/if}
              {#if fattura.pecDestinatario}
                <div class="col-span-2">
                  <dt class="text-xs text-muted-foreground">PEC destinatario</dt>
                  <dd class="text-sm break-all">{fattura.pecDestinatario}</dd>
                </div>
              {/if}
            </dl>
          </section>
        {/if}

        <!-- Causale -->
        {#if fattura.causale}
          <Separator />
          <section class="space-y-1">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Causale</h3>
            <p class="text-sm">{fattura.causale}</p>
          </section>
        {/if}

        <!-- Descrizioni linee -->
        {#if fattura.descrizioni.length > 0}
          <Separator />
          <section class="space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Linee ({fattura.descrizioni.length})
            </h3>
            <ul class="space-y-1">
              {#each fattura.descrizioni as desc, i}
                <li class="flex gap-2 text-sm">
                  <span class="shrink-0 text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <span>{desc}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

      </div>

      <Dialog.Footer class="gap-2">
        <Button variant="outline" size="sm" onclick={downloadXml}>
          <Download class="mr-2 h-3.5 w-3.5" />
          Scarica XML
        </Button>
        <Dialog.Close>
          <Button size="sm">Chiudi</Button>
        </Dialog.Close>
      </Dialog.Footer>

    {/if}

  </Dialog.Content>
</Dialog.Root>
