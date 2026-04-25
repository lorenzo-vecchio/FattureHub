<script lang="ts">
  import type { Fattura } from '$lib/parser';
  import { ArrowLeftRight } from 'lucide-svelte';

  let { fattura }: { fattura: Fattura } = $props();

  const hasTransmission = $derived(Boolean(
    fattura.formatoTrasmissione ||
      fattura.progressivoInvio ||
      fattura.codiceDestinatario ||
      fattura.pecDestinatario,
  ));
</script>

{#if hasTransmission}
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
