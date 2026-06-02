import { runAiAgent } from '$lib/ai-agent';
import type { AiConfig } from '$lib/ai-config';
import { saveReport, type Report } from '$lib/ai-reports';
import type { Fattura } from '$lib/parser';
import type { ModelMessage } from 'ai';

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

  async function sendMessage(
    prompt: string,
    fatture: Fattura[],
    config: AiConfig,
    projectId: string,
    onRunningChange: (running: boolean) => void,
  ) {
    if (!prompt.trim() || isProcessing) return;

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

    try {
      const { report, messages: modelMessages, conversationalText } = await runAiAgent({
        prompt: prompt.trim(),
        fatture,
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
    sendMessage,
    stopProcessing,
    clearChat,
    saveCurrentReport,
  };
}

export const chatStore = createChatStore();
