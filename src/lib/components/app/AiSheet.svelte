<script lang="ts">
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { Sparkles, Loader, Save, Trash2, ChevronRight, Send, Download, Square } from 'lucide-svelte';
  import type { ModelMessage } from 'ai';
  import type { Fattura } from '$lib/parser';
  import type { AiConfig } from '$lib/ai-config';
  import type { Report } from '$lib/ai-reports';
  import { saveReport, loadReports, deleteReport } from '$lib/ai-reports';
  import { runAiAgent } from '$lib/ai-agent';
  import { exportReportToDocx } from '$lib/export-docx';
  import ReportView from './ReportView.svelte';

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
            <!-- Prompt + generate -->
            <div class="space-y-2">
              <textarea
                class="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                placeholder="Es: Riepilogo prodotti per fornitore con quantità totali..."
                bind:value={prompt}
                disabled={running}
                rows={3}
              ></textarea>
              <Button class="w-full" disabled={running || !prompt.trim()} onclick={handleGenerate}>
                {#if running}
                  <Loader class="mr-2 h-4 w-4 animate-spin" />
                  Elaborazione...
                {:else}
                  <Sparkles class="mr-2 h-4 w-4" />
                  Genera Report
                {/if}
              </Button>
              {#if running || refining}
                <Button variant="destructive" class="w-full" onclick={handleStop}>
                  <Square class="mr-2 h-4 w-4 fill-current" />
                  Interrompi elaborazione
                </Button>
              {/if}
            </div>

            <!-- Progress -->
            {#if progressSteps.length > 0 || running || refining}
              <div class="space-y-1">
                <p class="text-xs font-medium text-muted-foreground">Avanzamento</p>
                <div class="rounded-md border bg-muted/30 px-3 py-2 space-y-1 max-h-36 overflow-y-auto">
                  {#each progressSteps as step}
                    <p class="text-xs text-muted-foreground flex items-center gap-1.5">
                      <ChevronRight class="h-3 w-3 shrink-0" />
                      {step}
                    </p>
                  {/each}
                  {#if running || refining}
                    <p class="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader class="h-3 w-3 animate-spin shrink-0" />
                      In elaborazione...
                    </p>
                  {/if}
                </div>
              </div>
            {/if}

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
              <!-- Refinement section -->
              <div class="space-y-2">
                <p class="text-xs font-medium text-muted-foreground">Affina il report</p>
                <textarea
                  bind:value={refinementPrompt}
                  disabled={refining}
                  rows={2}
                  placeholder="Es: Mostra solo prodotti con peso > 100 KG..."
                  class="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                ></textarea>
                <div class="flex gap-2">
                  <Button class="flex-1" disabled={refining || !refinementPrompt.trim()} onclick={handleRefine}>
                    {#if refining}
                      <Loader class="mr-2 h-4 w-4 animate-spin" />
                      Elaborazione...
                    {:else}
                      <Send class="mr-2 h-4 w-4" />
                      Invia
                    {/if}
                  </Button>
                  <Button variant="outline" onclick={handleNewAnalysis} disabled={refining || running}>
                    Nuova analisi
                  </Button>
                </div>
              </div>
            {/if}
          </div>

        {:else}
          <!-- Saved reports list -->
          {#if savedReports.length === 0}
            <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <p class="text-sm text-muted-foreground">Nessun report salvato per questo progetto.</p>
            </div>
          {:else}
            <div class="space-y-px px-3 py-3">
              {#each savedReports as report (report.id)}
                <div class="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60">
                  <div class="min-w-0 flex-1">
                    <p class="text-xs text-muted-foreground">{fmt.format(new Date(report.createdAt))}</p>
                    <p class="mt-0.5 text-sm truncate">{report.prompt}</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => handleDelete(report)} title="Elimina">
                      <Trash2 class="h-3.5 w-3.5 text-destructive" />
                    </Button>
                    <Button size="sm" class="h-7 text-xs" onclick={() => (viewingReport = report)}>
                      Apri
                    </Button>
                  </div>
                </div>
                <Separator class="mx-3" />
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      <!-- Fixed save bar -->
      {#if tab === 'new' && currentReport}
        <div class="shrink-0 border-t bg-background px-6 py-3 flex gap-2">
          <Button variant="outline" class="flex-1" onclick={handleSave}>
            <Save class="mr-2 h-4 w-4" />
            Salva report
          </Button>
          <Button variant="outline" onclick={() => exportReportToDocx(currentReport!)} title="Esporta DOCX">
            <Download class="mr-2 h-4 w-4" />
            Scarica DOCX
          </Button>
        </div>
      {/if}
    {/if}
  </Sheet.Content>
</Sheet.Root>

<!-- Dialog for viewing a saved report -->
{#if viewingReport}
  <Dialog.Root open={viewingReport !== null} onOpenChange={(v) => { if (!v) viewingReport = null; }}>
    <Dialog.Portal>
      <Dialog.Overlay />
      <Dialog.Content class="sm:max-w-[700px] max-h-[85vh] flex flex-col gap-0 p-0">
        <Dialog.Header class="shrink-0 px-6 py-4 border-b flex items-center justify-between">
          <Dialog.Title>Report</Dialog.Title>
          <Button variant="ghost" onclick={() => exportReportToDocx(viewingReport!)} title="Esporta DOCX">
            <Download class="mr-2 h-4 w-4" />
            Scarica DOCX
          </Button>
        </Dialog.Header>
        <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <ReportView report={viewingReport} />
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
{/if}
