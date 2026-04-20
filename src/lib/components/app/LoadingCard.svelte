<script lang="ts">
  import * as Card from '$lib/components/ui/card';

  let {
    parsingDone,
    parsingTotal,
    savingDone,
    savingTotal,
    stage,
  }: {
    parsingDone: number;
    parsingTotal: number;
    savingDone: number;
    savingTotal: number;
    stage: 'idle' | 'parsing' | 'saving';
  } = $props();

  const pct = (done: number, total: number): number => (total ? (done / total) * 100 : 0);
</script>

<Card.Root>
  <Card.Content class="py-8">
    <div class="mb-4 flex items-center gap-3">
      <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      <span class="text-sm font-medium">Importazione fatture in corso...</span>
    </div>

    <div class="mb-3">
      <div class="mb-1.5 flex items-center justify-between text-sm">
        <span class={stage === 'parsing' ? 'font-medium text-foreground' : 'text-muted-foreground'}>
          1. Analisi file
        </span>
        <span class="text-muted-foreground">{parsingDone} / {parsingTotal}</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          class="h-full bg-primary transition-all duration-300"
          style="width: {pct(parsingDone, parsingTotal)}%"
        ></div>
      </div>
    </div>

    <div>
      <div class="mb-1.5 flex items-center justify-between text-sm">
        <span class={stage === 'saving' ? 'font-medium text-foreground' : 'text-muted-foreground'}>
          2. Salvataggio database
        </span>
        <span class="text-muted-foreground">{savingDone} / {savingTotal}</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          class="h-full bg-primary transition-all duration-300"
          style="width: {pct(savingDone, savingTotal)}%"
        ></div>
      </div>
    </div>
  </Card.Content>
</Card.Root>
