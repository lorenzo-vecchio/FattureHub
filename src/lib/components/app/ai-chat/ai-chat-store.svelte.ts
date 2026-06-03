import { runAiAgent } from '$lib/ai-agent';
import type { AiConfig } from '$lib/ai-config';
import { saveReport, type Report } from '$lib/ai-reports';
import type { Fattura } from '$lib/parser';
import type { ModelMessage } from 'ai';
import type { ProjectMeta } from '$lib/projects';
import { getAllInvoices } from '$lib/db-sqlite';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  progressSteps?: string[];
  report?: Report | null;
  isProcessing?: boolean;
  error?: string | null;
};

function createChatStore() {
  let messages = $state<ChatMessage[]>([]);
  let isProcessing = $state(false);
  let currentReport = $state<Report | null>(null);
  let inputValue = $state('');
  let conversationMessages = $state<ModelMessage[]>([]);
  let contextProjects = $state<ProjectMeta[]>([]);
  let contextFatture = $state<Fattura[]>([]);
  let abortController: AbortController | null = null;

  function addMessage(msg: ChatMessage) {
    messages = [...messages, msg];
  }

  function updateLastAssistant(update: Partial<ChatMessage>) {
    const idx = messages.length - 1;
    if (idx >= 0 && messages[idx].role === 'assistant') {
      messages = [...messages.slice(0, idx), { ...messages[idx], ...update }];
    }
  }

  function stopProcessing() {
    abortController?.abort();
    abortController = null;
    isProcessing = false;
    updateLastAssistant({ isProcessing: false, error: 'Elaborazione interrotta.' });
  }

  async function addContextProject(project: ProjectMeta) {
    if (contextProjects.some((p) => p.id === project.id)) return;
    contextProjects = [...contextProjects, project];
    const invoices = await getAllInvoices(project.id);
    const existingIds = new Set(contextFatture.map((f) => f.id));
    const newFatture = invoices.filter((f) => !existingIds.has(f.id));
    contextFatture = [...contextFatture, ...newFatture];
  }

  async function removeContextProject(projectId: string) {
    contextProjects = contextProjects.filter((p) => p.id !== projectId);
    const allFatture: Fattura[] = [];
    for (const p of contextProjects) {
      const invoices = await getAllInvoices(p.id);
      allFatture.push(...invoices);
    }
    contextFatture = allFatture;
  }

  function clearContextProjects() {
    contextProjects = [];
    contextFatture = [];
  }

  async function sendMessage(
    prompt: string,
    config: AiConfig,
    onRunningChange: (running: boolean) => void,
  ) {
    if (!prompt.trim() || isProcessing) return;

    const contextInfo = contextProjects.length > 0
      ? `[Contesto: progetti ${contextProjects.map((p) => p.name).join(', ')}]\n\n`
      : '';

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMessage);
    inputValue = '';

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      progressSteps: [],
      report: null,
      isProcessing: true,
      error: null,
    };
    addMessage(assistantMessage);

    isProcessing = true;
    onRunningChange(true);

    const controller = new AbortController();
    abortController = controller;

    const projectId = contextProjects.length > 0 ? contextProjects[0].id : 'default';

    try {
      const { report, messages: modelMessages, conversationalText } = await runAiAgent({
        prompt: contextInfo + prompt.trim(),
        fatture: contextFatture,
        config,
        projectId,
        onProgress: (msg) => {
          const currentSteps = messages[messages.length - 1]?.progressSteps ?? [];
          updateLastAssistant({ progressSteps: [...currentSteps, msg] });
        },
        conversationMessages: conversationMessages.length > 0 ? conversationMessages : undefined,
        abortSignal: controller.signal,
      });

      // Preserve report ID when refining existing report
      if (currentReport) {
        report.id = currentReport.id;
        report.createdAt = currentReport.createdAt;
      }
      currentReport = report;
      conversationMessages = modelMessages;

      updateLastAssistant({
        content: conversationalText || 'Report generato.',
        report,
        isProcessing: false,
      });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        updateLastAssistant({ error: 'Elaborazione interrotta.', isProcessing: false });
      } else {
        updateLastAssistant({ error: String(e), isProcessing: false });
      }
    } finally {
      isProcessing = false;
      abortController = null;
      onRunningChange(false);
    }
  }

  function clearChat() {
    messages = [];
    currentReport = null;
    conversationMessages = [];
    inputValue = '';
  }

  async function saveCurrentReport() {
    if (!currentReport) return;
    await saveReport(currentReport);
  }

  return {
    get messages() { return messages; },
    get isProcessing() { return isProcessing; },
    get currentReport() { return currentReport; },
    get inputValue() { return inputValue; },
    set inputValue(v: string) { inputValue = v; },
    get contextProjects() { return contextProjects; },
    get contextFatture() { return contextFatture; },
    addContextProject,
    removeContextProject,
    clearContextProjects,
    sendMessage,
    stopProcessing,
    clearChat,
    saveCurrentReport,
  };
}

export const chatStore = createChatStore();
