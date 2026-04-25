<script lang="ts">
  import type { Fattura } from '$lib/parser';
  import { cessionarioLabel } from '$lib/parser';
  import { User } from 'lucide-svelte';

  let { fattura }: { fattura: Fattura } = $props();
</script>

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
