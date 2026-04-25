<script lang="ts">
  import { runAiAgent } from '$lib/ai-agent';
  import type { AiConfig } from '$lib/ai-config';
  import type { Report } from '$lib/ai-reports';
  import { deleteReport, loadReports, saveReport } from '$lib/ai-reports';
  import { Separator } from '$lib/components/ui/separator';
  import * as Sheet from '$lib/components/ui/sheet';
  import { exportReportToDocx } from '$lib/export-docx';
  import type { Fattura } from '$lib/parser';
  import type { ModelMessage } from 'ai';
  import { Sparkles } from 'lucide-svelte';
  import ReportView from './ReportView.svelte';
  import AiProgressLog from './ai-sheet/AiProgressLog.svelte';
  import AiPromptComposer from './ai-sheet/AiPromptComposer.svelte';
  import AiRefinementPanel from './ai-sheet/AiRefinementPanel.svelte';
  import AiSaveBar from './ai-sheet/AiSaveBar.svelte';
  import AiSavedReportsList from './ai-sheet/AiSavedReportsList.svelte';
  import AiViewReportDialog from './ai-sheet/AiViewReportDialog.svelte';

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

  type Tab = 'new' | 'saved';
  let tab = $state<Tab>('new');

  let prompt = $state('');
  let running = $state(false);
  let progressSteps = $state<string[]>([]);
  let currentReport = $state<Report | null>(null);
  let savedReports = $state<Report[]>([]);
  let viewingReport = $state<Report | null>(null);
  let errorMsg = $state<string | null>(null);

  let conversationMessages = $state<ModelMessage[]>([]);
  let refinementPrompt = $state('');
  let refining = $state(false);
  // Not $state — AbortController must NOT be proxied by Svelte or .abort() breaks
  let abortController: AbortController | null = null;

  function handleOpenChange(v: boolean) {
    open = v;
    if (v && projectId) void loadSaved();
  }
  
  async function loadSaved() {
    if (!projectId) return;
    savedReports = await loadReports(projectId);
  }

  function handleStop() {
    abortController?.abort();
    abortController = null;
  }

  async function handleGenerate() {
    if (!prompt.trim() || !projectId || running) return;
    running = true;
    onrunningChange(true);
    progressSteps = [];
    currentReport = null;
    errorMsg = null;
    conversationMessages = [];
    const controller = new AbortController();
    abortController = controller;

    try {
      const { report, messages } = await runAiAgent({
        prompt,
        fatture,
        config,
        projectId,
        onProgress: (msg) => { progressSteps = [...progressSteps, msg]; },
        abortSignal: controller.signal,
      });
      currentReport = report;
      conversationMessages = messages;
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        progressSteps = [...progressSteps, 'Elaborazione interrotta.'];
      } else {
        errorMsg = String(e);
      }
    } finally {
      running = false;
      abortController = null;
      onrunningChange(false);
    }
  }

  async function handleRefine() {
    if (!refinementPrompt.trim() || !projectId || refining) return;
    refining = true;
    onrunningChange(true);
    progressSteps = [];
    errorMsg = null;
    const controller = new AbortController();
    abortController = controller;

    try {
      const { report, messages } = await runAiAgent({
        prompt: refinementPrompt,
        fatture,
        config,
        projectId,
        onProgress: (msg) => { progressSteps = [...progressSteps, msg]; },
        conversationMessages,
        abortSignal: controller.signal,
      });
      currentReport = report;
      conversationMessages = messages;
      refinementPrompt = '';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        progressSteps = [...progressSteps, 'Elaborazione interrotta.'];
      } else {
        errorMsg = String(e);
      }
    } finally {
      refining = false;
      abortController = null;
      onrunningChange(false);
    }
  }

  function handleNewAnalysis() {
    currentReport = null;
    conversationMessages = [];
    refinementPrompt = '';
    progressSteps = [];
    errorMsg = null;
    prompt = '';
  }

  async function handleSave() {
    if (!currentReport) return;
    await saveReport(currentReport);
    savedReports = [currentReport, ...savedReports.filter(r => r.id !== currentReport!.id)];
    currentReport = null;
    prompt = '';
    progressSteps = [];
    conversationMessages = [];
    tab = 'saved';
  }

  async function handleDelete(report: Report) {
    if (!projectId) return;
    await deleteReport(projectId, report.id);
    savedReports = savedReports.filter(r => r.id !== report.id);
    if (viewingReport?.id === report.id) viewingReport = null;
  }

  const fmt = new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
</script>

<Sheet.Root open={open} onOpenChange={handleOpenChange}>
  <Sheet.Content side="right" class="flex w-[520px] flex-col gap-0 p-0 sm:max-w-[520px]">

    <!-- Fixed header -->
    <Sheet.Header class="shrink-0 border-b px-6 py-4">
      <Sheet.Title class="flex items-center gap-2">
        <Sparkles class="h-4 w-4" />
        Assistente AI
      </Sheet.Title>
    </Sheet.Header>

    {#if !projectId || fatture.length === 0}
      <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <Sparkles class="h-10 w-10 text-muted-foreground/40" />
        <p class="text-sm text-muted-foreground">
          {fatture.length === 0 ? 'Carica delle fatture per usare l\'AI.' : 'Apri un progetto per generare report.'}
        </p>
      </div>
    {:else}
      <!-- Fixed tabs -->
      <div class="shrink-0 flex border-b">
        <button
          class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors {tab === 'new' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => (tab = 'new')}
        >
          Nuovo
        </button>
        <button
          class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors {tab === 'saved' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => { tab = 'saved'; void loadSaved(); }}
        >
          Salvati {#if savedReports.length > 0}({savedReports.length}){/if}
        </button>
      </div>

      <!-- Scrollable content -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        {#if tab === 'new'}
          <div class="space-y-4 px-6 py-5">
            <AiPromptComposer
              {prompt}
              {running}
              {refining}
              updatePrompt={(value) => (prompt = value)}
              generate={handleGenerate}
              stop={handleStop}
            />

            <AiProgressLog steps={progressSteps} {running} {refining} />

            <!-- Error -->
            {#if errorMsg}
              <div class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
                <p class="text-xs text-destructive">{errorMsg}</p>
              </div>
            {/if}

            <!-- Report preview -->
            {#if currentReport}
              <Separator />
              <ReportView report={currentReport} />

              <Separator />
              <AiRefinementPanel
                prompt={refinementPrompt}
                {refining}
                {running}
                updatePrompt={(value) => (refinementPrompt = value)}
                refine={handleRefine}
                reset={handleNewAnalysis}
              />
            {/if}
          </div>

        {:else}
          <AiSavedReportsList
            reports={savedReports}
            openReport={(report) => (viewingReport = report)}
            removeReport={handleDelete}
            formatDate={(date) => fmt.format(new Date(date))}
          />
        {/if}
      </div>

      <!-- Fixed save bar -->
      {#if tab === 'new' && currentReport}
        <AiSaveBar
          saveReport={handleSave}
          exportDocx={() => exportReportToDocx(currentReport!)}
        />
      {/if}
    {/if}
  </Sheet.Content>
</Sheet.Root>

<AiViewReportDialog
  report={viewingReport}
  close={() => (viewingReport = null)}
  exportDocx={() => exportReportToDocx(viewingReport!)}
/>
