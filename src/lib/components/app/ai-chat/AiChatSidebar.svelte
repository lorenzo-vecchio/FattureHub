<script lang="ts">
  import AiChatMessages from './AiChatMessages.svelte';
  import AiChatContextBar from './AiChatContextBar.svelte';
  import AiChatInput from './AiChatInput.svelte';
  import type { ChatMessage } from './ai-chat-store.svelte';
  import type { ProjectMeta } from '$lib/projects';
  import type { AiConfig } from '$lib/ai-config';

  let {
    messages,
    inputValue,
    isProcessing,
    contextProjects,
    config = null,
    onsend,
    onstop,
    onInputChange,
    onaddcontext,
    onremovecontext,
  }: {
    messages: ChatMessage[];
    inputValue: string;
    isProcessing: boolean;
    contextProjects: ProjectMeta[];
    config?: AiConfig | null;
    onsend: () => void;
    onstop: () => void;
    onInputChange: (v: string) => void;
    onaddcontext: (project: ProjectMeta) => void;
    onremovecontext: (id: string) => void;
  } = $props();
</script>

<div class="flex h-full flex-col bg-background">
  <div class="flex-1 min-h-0 overflow-hidden">
    <AiChatMessages {messages} {contextProjects} {config} />
  </div>

  <AiChatContextBar
    {contextProjects}
    onadd={onaddcontext}
    onremove={onremovecontext}
  />

  <AiChatInput
    value={inputValue}
    {isProcessing}
    {contextProjects}
    {onsend}
    {onstop}
    {onInputChange}
    {onaddcontext}
  />
</div>
