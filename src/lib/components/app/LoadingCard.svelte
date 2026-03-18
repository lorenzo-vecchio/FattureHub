<script lang="ts">
  import * as Card from '$lib/components/ui/card';

  let { done, total }: { done: number; total: number } = $props();
</script>

<Card.Root>
  <Card.Content class="py-8">
    <div class="flex items-center gap-3 mb-3">
      <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      <span class="text-sm font-medium">Analisi fatture in corso...</span>
      <span class="text-sm text-muted-foreground">{done} / {total}</span>
    </div>
    <div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        class="h-full bg-primary transition-all duration-300"
        style="width: {total ? (done / total) * 100 : 0}%"
      ></div>
    </div>
  </Card.Content>
</Card.Root>
