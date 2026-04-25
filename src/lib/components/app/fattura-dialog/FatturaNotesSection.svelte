<script lang="ts">
  import type { Fattura } from '$lib/parser';

  let { fattura }: { fattura: Fattura } = $props();
</script>

<div class="space-y-3">
  {#if fattura.causale}
    <section class="space-y-1">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Causale</h3>
      <p class="text-sm">{fattura.causale}</p>
    </section>
  {/if}

  {#if fattura.descrizioni.length > 0}
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
