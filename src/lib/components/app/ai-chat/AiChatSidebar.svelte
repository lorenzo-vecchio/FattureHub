<script lang="ts">
  import AiChatMessages from './AiChatMessages.svelte';
  import AiChatInput from './AiChatInput.svelte';
  import type { ChatMessage } from './ai-chat-store.svelte';

  let {
    messages,
    inputValue,
    isProcessing,
    onsend,
    onstop,
    onInputChange,
  }: {
    messages: ChatMessage[];
    inputValue: string;
    isProcessing: boolean;
    onsend: () => void;
    onstop: () => void;
    onInputChange: (v: string) => void;
  } = $props();
</script>

<div class="flex h-full flex-col bg-background">
  <div class="flex-1 min-h-0 overflow-hidden">
    <AiChatMessages {messages} />
  </div>

  <AiChatInput
    value={inputValue}
    {isProcessing}
    {onsend}
    {onstop}
    {onInputChange}
  />
</div>
