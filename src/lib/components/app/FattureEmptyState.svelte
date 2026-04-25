<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Funnel, RotateCcw } from 'lucide-svelte';

  let { onreset }: { onreset: () => void } = $props();
</script>

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
