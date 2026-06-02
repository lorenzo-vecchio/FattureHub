<script lang="ts">
  import AiChatMessageBubble from './AiChatMessageBubble.svelte';
  import type { ChatMessage } from './ai-chat-store.svelte';

  let {
    messages,
  }: {
    messages: ChatMessage[];
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
  <div class="flex flex-col gap-4 px-4 py-4">
    {#each messages as message (message.id)}
      <AiChatMessageBubble {message} />
    {/each}
  </div>
</div>
