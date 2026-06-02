<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Send, Square } from 'lucide-svelte';

  let {
    value,
    isProcessing,
    onsend,
    onstop,
    onInputChange,
  }: {
    value: string;
    isProcessing: boolean;
    onsend: () => void;
    onstop: () => void;
    onInputChange: (v: string) => void;
  } = $props();

  let textareaEl: HTMLTextAreaElement | undefined = $state();

  const maxLines = 5;
  let lineHeight = 0;

  function resize() {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    const capped = Math.min(textareaEl.scrollHeight, lineHeight * maxLines + 20);
    textareaEl.style.height = capped + 'px';
    textareaEl.style.overflowY = textareaEl.scrollHeight > capped ? 'auto' : 'hidden';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onsend();
    }
  }

  $effect(() => {
    void value;
    if (textareaEl) {
      const computed = getComputedStyle(textareaEl);
      lineHeight = parseFloat(computed.lineHeight) || 21;
    }
    resize();
  });
</script>

<div class="border-t bg-background px-4 py-3">
  <div class="mx-auto flex max-w-3xl items-end gap-2">
    <textarea
      bind:this={textareaEl}
      value={value}
      disabled={isProcessing}
      placeholder="Scrivi una richiesta per l'Assistente AI..."
      rows={1}
      class="min-h-[40px] flex-1 resize-none overflow-y-hidden rounded-xl border bg-muted/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      oninput={(e) => { onInputChange((e.target as HTMLTextAreaElement).value); resize(); }}
      onkeydown={handleKeydown}
    ></textarea>
    {#if isProcessing}
      <Button variant="destructive" size="icon" class="h-10 w-10 shrink-0 rounded-xl" onclick={onstop} title="Interrompi">
        <Square class="h-4 w-4 fill-current" />
      </Button>
    {:else}
      <Button size="icon" class="h-10 w-10 shrink-0 rounded-xl" disabled={!value.trim()} onclick={onsend} title="Invia">
        <Send class="h-4 w-4" />
      </Button>
    {/if}
  </div>
  <p class="mt-1 text-center text-[10px] text-muted-foreground">
    Premi Invio per inviare &middot; Maiusc+Invio per andare a capo
  </p>
</div>
