<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { X } from 'lucide-svelte';

  let { fattureCount, activeFilters, onclear }: {
    fattureCount: number;
    activeFilters: number;
    onclear: () => void;
  } = $props();
</script>

<header class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
  <div class="mx-auto max-w-7xl flex h-14 items-center justify-between px-6">
    <div class="flex items-center gap-3">
      <h1 class="text-base font-semibold">Filtro Fatture Elettroniche</h1>
      {#if fattureCount > 0}
        <Badge variant="secondary">{fattureCount} caricate</Badge>
      {/if}
      {#if activeFilters > 0}
        <Badge>{activeFilters} filtri attivi</Badge>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if fattureCount > 0}
        <Button variant="ghost" size="sm" onclick={onclear}>
          <X class="mr-1.5 h-3.5 w-3.5" />
          Svuota tutto
        </Button>
      {/if}
    </div>
  </div>
</header>
