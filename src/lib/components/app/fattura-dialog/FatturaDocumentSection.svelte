<script lang="ts">
  import type { Fattura } from '$lib/parser';
  import { FileText } from 'lucide-svelte';

  let { fattura }: { fattura: Fattura } = $props();
</script>

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
