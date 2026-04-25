<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import type { Fattura } from '$lib/parser';
  import { cedenteLabel } from '$lib/parser';
  import { Building2 } from 'lucide-svelte';

  let { fattura }: { fattura: Fattura } = $props();
</script>

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
