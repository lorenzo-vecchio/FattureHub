<script lang="ts">
  import AiChatSidebar from './AiChatSidebar.svelte';
  import AiReportPanel from './AiReportPanel.svelte';
  import { exportReportToDocx } from '$lib/export-docx';
  import { Button } from '$lib/components/ui/button';
  import { ResizablePaneGroup, ResizablePane, ResizableHandle } from '$lib/components/ui/resizable';
  import { Download, Save, Trash2, Sparkles, ArrowLeft } from 'lucide-svelte';
  import type { ChatMessage } from './ai-chat-store.svelte';
  import type { AiConfig } from '$lib/ai-config';
  import type { Report } from '$lib/ai-reports';
  import type { ProjectMeta } from '$lib/projects';

  let {
    messages,
    inputValue,
    isProcessing,
    currentReport,
    contextProjects,
    config,
    fattureCount,
    onsend,
    onstop,
    onInputChange,
    onclear,
    onsave,
    onclose,
    onaddcontext,
    onremovecontext,
  }: {
    messages: ChatMessage[];
    inputValue: string;
    isProcessing: boolean;
    currentReport: Report | null;
    contextProjects: ProjectMeta[];
    config: AiConfig;
    fattureCount: number;
    onsend: () => void;
    onstop: () => void;
    onInputChange: (v: string) => void;
    onclear: () => void;
    onsave: () => void;
    onclose: () => void;
    onaddcontext: (project: ProjectMeta) => void;
    onremovecontext: (id: string) => void;
  } = $props();

  function handleExport() {
    const report = currentReport;
    if (report) exportReportToDocx(report);
  }
</script>

<div class="flex h-full flex-col bg-background">
  <div class="flex items-center justify-between border-b px-4 py-2 shrink-0">
    <div class="flex items-center gap-2">
      <button
        onclick={onclose}
        class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Indietro"
      >
        <ArrowLeft class="h-4 w-4" />
      </button>
      <Sparkles class="h-4 w-4 text-muted-foreground" />
      <h2 class="text-sm font-semibold">Assistente AI</h2>
    </div>
    <div class="flex items-center gap-1">
      {#if messages.length > 0}
        <button
          onclick={onclear}
          class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Nuova conversazione"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      {/if}
      {#if currentReport}
        <Button size="sm" variant="outline" class="h-7 text-xs" onclick={onsave}>
          <Save class="mr-1 h-3 w-3" />
          Salva
        </Button>
        <Button size="sm" variant="outline" class="h-7 text-xs" onclick={handleExport}>
          <Download class="mr-1 h-3 w-3" />
          DOCX
        </Button>
      {/if}
    </div>
  </div>

  {#if fattureCount === 0}
    <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p class="text-sm text-muted-foreground">
        Carica delle fatture per usare l'AI.
      </p>
    </div>
  {:else}
    <div class="flex-1 min-h-0">
      <ResizablePaneGroup direction="horizontal">
        <ResizablePane minSize={30} defaultSize={currentReport ? 40 : 100}>
          <AiChatSidebar
            {messages}
            {inputValue}
            {isProcessing}
            {contextProjects}
            {onaddcontext}
            {onremovecontext}
            onsend={onsend}
            onstop={onstop}
            onInputChange={onInputChange}
          />
        </ResizablePane>

        {#if currentReport}
          <ResizableHandle withHandle/>
          <ResizablePane minSize={30} defaultSize={60}>
            <AiReportPanel report={currentReport} />
          </ResizablePane>
        {/if}
      </ResizablePaneGroup>
    </div>
  {/if}
</div>
