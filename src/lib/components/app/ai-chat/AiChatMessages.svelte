<script lang="ts">
  import AiChatMessageBubble from './AiChatMessageBubble.svelte';
  import { Sparkles } from 'lucide-svelte';
  import type { ChatMessage } from './ai-chat-store.svelte';
  import type { ProjectMeta } from '$lib/projects';

  let {
    messages,
    contextProjects,
  }: {
    messages: ChatMessage[];
    contextProjects: ProjectMeta[];
  } = $props();

  let container = $state<HTMLDivElement | undefined>(undefined);

  $effect(() => {
    if (container && messages.length > 0) {
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight;
      });
    }
  });
</script>

<div bind:this={container} class="h-full overflow-y-auto">
  {#if messages.length === 0}
    <div class="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <Sparkles class="mb-3 h-8 w-8 text-muted-foreground/60" strokeWidth={1.5} />
      {#if contextProjects.length > 0}
        <p class="mb-4 text-sm font-medium text-muted-foreground">
          Cosa vuoi chiedere sull'AI?
        </p>
        <div class="space-y-2 text-xs text-muted-foreground/70 max-w-sm">
          <p class="rounded-lg border bg-muted/30 px-3 py-2">
            “Fammi un riepilogo delle fatture di {contextProjects[0].name}”
          </p>
          <p class="rounded-lg border bg-muted/30 px-3 py-2">
            “Qual è l'importo totale delle fatture?”
          </p>
          <p class="rounded-lg border bg-muted/30 px-3 py-2">
            “Mostrami i fornitori con il maggior numero di fatture”
          </p>
          <p class="rounded-lg border bg-muted/30 px-3 py-2">
            “Quali sono le fatture in scadenza questo mese?”
          </p>
        </div>
      {:else}
        <p class="mb-2 text-sm font-medium text-muted-foreground">
          Nessun progetto nel contesto
        </p>
        <p class="text-xs text-muted-foreground/60 max-w-xs">
          Aggiungi un progetto con <kbd class="rounded border bg-muted px-1 font-mono">@</kbd> seguito dal nome, o dal pulsante <strong>+ Progetto</strong> qui sotto, poi chiedi all'AI cosa vuoi sapere.
        </p>
      {/if}
    </div>
  {:else}
    <div class="flex flex-col gap-4 px-4 py-4">
      {#each messages as message (message.id)}
        <AiChatMessageBubble {message} />
      {/each}
    </div>
  {/if}
</div>
