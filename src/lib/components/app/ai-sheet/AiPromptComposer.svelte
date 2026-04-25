<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Loader, Sparkles, Square } from 'lucide-svelte';

  let {
    prompt,
    running,
    refining,
    updatePrompt,
    generate,
    stop,
  }: {
    prompt: string;
    running: boolean;
    refining: boolean;
    updatePrompt: (value: string) => void;
    generate: () => void;
    stop: () => void;
  } = $props();
</script>

<div class="space-y-2">
  <textarea
    class="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
    placeholder="Es: Riepilogo prodotti per fornitore con quantità totali..."
    value={prompt}
    disabled={running}
    rows={3}
    oninput={(e) => updatePrompt((e.target as HTMLTextAreaElement).value)}
  ></textarea>
  <Button class="w-full" disabled={running || !prompt.trim()} onclick={generate}>
    {#if running}
      <Loader class="mr-2 h-4 w-4 animate-spin" />
      Elaborazione...
    {:else}
      <Sparkles class="mr-2 h-4 w-4" />
      Genera Report
    {/if}
  </Button>
  {#if running || refining}
    <Button variant="destructive" class="w-full" onclick={stop}>
      <Square class="mr-2 h-4 w-4 fill-current" />
      Interrompi elaborazione
    </Button>
  {/if}
</div>
