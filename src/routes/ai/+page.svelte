<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';
  import { chatStore } from '$lib/components/app/ai-chat/ai-chat-store.svelte';
  import AiChatShell from '$lib/components/app/ai-chat/AiChatShell.svelte';

  onMount(() => {
    if (app.currentProject) {
      const meta = app.projectsList.find((p) => p.id === app.currentProject!.id);
      if (meta && !chatStore.contextProjects.some((p) => p.id === meta.id)) {
        chatStore.addContextProject(meta);
      }
    }
  });

  function handleClose() {
    goto('/workspace');
  }
</script>

<div class="flex h-full flex-col">
  <AiChatShell
    messages={chatStore.messages}
    inputValue={chatStore.inputValue}
    isProcessing={chatStore.isProcessing}
    currentReport={chatStore.currentReport}
    contextProjects={chatStore.contextProjects}
    config={app.aiConfig}
    fattureCount={app.fatture.length}
    onsend={() => chatStore.sendMessage(chatStore.inputValue, app.aiConfig, (v) => (app.isAiRunningWritable = v))}
    onstop={() => { chatStore.stopProcessing(); app.isAiRunningWritable = false; }}
    onInputChange={(v) => (chatStore.inputValue = v)}
    onclear={() => chatStore.clearChat()}
    onsave={() => chatStore.saveCurrentReport()}
    onclose={handleClose}
    onaddcontext={(p) => chatStore.addContextProject(p)}
    onremovecontext={(id) => chatStore.removeContextProject(id)}
  />
</div>
