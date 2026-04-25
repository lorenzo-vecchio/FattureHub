<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Loader, Send } from 'lucide-svelte';

  let {
    prompt,
    refining,
    running,
    updatePrompt,
    refine,
    reset,
  }: {
    prompt: string;
    refining: boolean;
    running: boolean;
    updatePrompt: (value: string) => void;
    refine: () => void;
    reset: () => void;
  } = $props();
</script>

<div class="space-y-2">
  <p class="text-xs font-medium text-muted-foreground">Affina il report</p>
  <textarea
    value={prompt}
    disabled={refining}
    rows={2}
    placeholder="Es: Mostra solo prodotti con peso > 100 KG..."
    class="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
    oninput={(e) => updatePrompt((e.target as HTMLTextAreaElement).value)}
  ></textarea>
  <div class="flex gap-2">
    <Button class="flex-1" disabled={refining || !prompt.trim()} onclick={refine}>
      {#if refining}
        <Loader class="mr-2 h-4 w-4 animate-spin" />
        Elaborazione...
      {:else}
        <Send class="mr-2 h-4 w-4" />
        Invia
      {/if}
    </Button>
    <Button variant="outline" onclick={reset} disabled={refining || running}>
      Nuova analisi
    </Button>
  </div>
</div>
