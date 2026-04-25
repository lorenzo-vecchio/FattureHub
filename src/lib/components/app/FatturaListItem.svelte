<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
  import type { Fattura } from '$lib/parser';
  import { cedenteLabel } from '$lib/parser';

  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  let { fat, onopen }: { fat: Fattura; onopen: () => void } = $props();
</script>

<Card.Root
  class="transition-colors hover:border-foreground/30 cursor-pointer"
  onclick={onopen}
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
