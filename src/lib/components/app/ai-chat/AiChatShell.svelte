<script lang="ts">
  import { chatStore } from './ai-chat-store.svelte';
  import { exportReportToDocx } from '$lib/export-docx';
  import AiChatSidebar from './AiChatSidebar.svelte';
  import AiReportPanel from './AiReportPanel.svelte';
  import type { AiConfig } from '$lib/ai-config';
  import type { Fattura } from '$lib/parser';
  import { Button } from '$lib/components/ui/button';
  import { ResizablePaneGroup, ResizablePane, ResizableHandle } from '$lib/components/ui/resizable';
  import { Download, Save, Trash2, Sparkles, X } from 'lucide-svelte';

  let {
    open = $bindable(false),
    fatture,
    config,
    projectId,
    onrunningChange,
  }: {
    open: boolean;
    fatture: Fattura[];
    config: AiConfig;
    projectId: string | null;
    onrunningChange: (running: boolean) => void;
  } = $props();

  function handleSend() {
    if (!projectId || chatStore.isProcessing) return;
    chatStore.sendMessage(
      chatStore.inputValue,
      fatture,
      config,
      projectId,
      onrunningChange,
    );
  }

  function handleStop() {
    chatStore.stopProcessing();
    onrunningChange(false);
  }

  function handleClose() {
    open = false;
  }

  function handleClear() {
    chatStore.clearChat();
  }

  function handleSave() {
    chatStore.saveCurrentReport();
  }

  function handleExport() {
    const report = chatStore.currentReport;
    if (report) exportReportToDocx(report);
  }

  function handleInputChange(v: string) {
    chatStore.inputValue = v;
  }

</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex flex-col bg-background"
    role="dialog"
    aria-modal="true"
  >
    {#if !projectId || fatture.length === 0}
      <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p class="text-sm text-muted-foreground">
          {fatture.length === 0 ? 'Carica delle fatture per usare l\'AI.' : 'Apri un progetto per generare report.'}
        </p>
      </div>
    {:else}
      <div class="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div class="flex items-center gap-2">
          <Sparkles class="h-4 w-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold">Assistente AI</h2>
        </div>
        <div class="flex items-center gap-1">
          {#if chatStore.messages.length > 0}
            <button
              onclick={handleClear}
              class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Nuova conversazione"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          {/if}
          {#if chatStore.currentReport}
            <Button size="sm" variant="outline" class="h-7 text-xs" onclick={handleSave}>
              <Save class="mr-1 h-3 w-3" />
              Salva
            </Button>
            <Button size="sm" variant="outline" class="h-7 text-xs" onclick={handleExport}>
              <Download class="mr-1 h-3 w-3" />
              DOCX
            </Button>
          {/if}
          <button
            onclick={handleClose}
            class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Chiudi"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="flex-1 min-h-0">
        <ResizablePaneGroup direction="horizontal">
          <ResizablePane minSize={30} defaultSize={chatStore.currentReport ? 40 : 100}>
            <AiChatSidebar
              messages={chatStore.messages}
              inputValue={chatStore.inputValue}
              isProcessing={chatStore.isProcessing}
              onsend={handleSend}
              onstop={handleStop}
              onInputChange={handleInputChange}
            />
          </ResizablePane>

          {#if chatStore.currentReport}
            <ResizableHandle withHandle/>
            <ResizablePane minSize={30} defaultSize={60}>
              <AiReportPanel report={chatStore.currentReport} />
            </ResizablePane>
          {/if}
        </ResizablePaneGroup>
      </div>
    {/if}
  </div>
{/if}
