import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { AiConfig } from './ai-config';
import { tauriFetch } from './ai-fetch';

function buildModel(config: AiConfig) {
  const modelName = config.taskModel || config.model;
  if (!modelName) throw new Error('Nessun modello configurato');
  if (config.provider === 'anthropic') {
    const provider = createAnthropic({
      apiKey: config.apiKey,
      ...(config.endpoint ? { baseURL: config.endpoint } : {}),
      fetch: tauriFetch as typeof fetch,
    });
    return (provider as any)(modelName);
  }
  const provider = createOpenAI({
    apiKey: config.apiKey,
    ...(config.endpoint ? { baseURL: config.endpoint } : {}),
    fetch: tauriFetch as typeof fetch,
  });
  return (provider as any).chat(modelName);
}

/**
 * Generates a brief acknowledgment message before starting analysis.
 * Fast single-sentence response so the user knows what's happening.
 */
export async function generateAcknowledgment(
  userPrompt: string,
  config: AiConfig,
  contextInfo: string,
  abortSignal?: AbortSignal,
): Promise<string> {
  try {
    const result = await generateText({
      model: buildModel(config),
      system: `Sei un assistente AI per analisi fatture. Rispondi con UNA SOLA FRASE (max 20 parole) che confermi all'utente di aver capito la richiesta e che stai iniziando l'analisi. Non aggiungere saluti, emoji, o domande. Sii diretto e professionale.`,
      prompt: `L'utente ha chiesto: "${userPrompt}". ${contextInfo ? `Contesto: ${contextInfo}` : ''}`,
      abortSignal,
    });
    return result.text.trim();
  } catch {
    // Fallback generico
    return 'Ho capito, procedo con l\'analisi richiesta.';
  }
}
