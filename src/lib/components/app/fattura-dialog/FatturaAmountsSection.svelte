<script lang="ts">
  import type { Fattura } from '$lib/parser';

  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  let { fattura }: { fattura: Fattura } = $props();
</script>

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
