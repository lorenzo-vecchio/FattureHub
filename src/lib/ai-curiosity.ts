import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { AiConfig } from './ai-config';
import { tauriFetch } from './ai-fetch';

const SEEN_CURIOSITIES = new Set<string>();
const CACHE: string[] = [];

const CURIOSITY_SYSTEM = `Sei un esperto di curiosità sul fisco, le leggi e la burocrazia italiana.
Genera una curiosità breve (1-2 frasi, max 200 caratteri) su uno di questi temi:
- Curiosità storiche sul fisco italiano
- Aneddoti sulle leggi italiane (leggi buffe, paradossi burocratici)
- Record e statistiche interessanti sull'economia italiana
- Storie curiose di tasse, commercialisti e imprese
- Differenze regionali interessanti (fisco, economia, burocrazia)

Regole:
- MAI offensiva, mai politica, mai denigratoria
- Al massimo divertente o neutra
- Deve essere vera o verosimile
- Non ripetere la stessa curiosità
- Non usare formattazione, solo testo semplice
- Non usare asterischi o markdown
- Rispondi SOLO con la curiosità, nient'altro`;

function buildModel(config: AiConfig) {
  const modelName = config.taskModel || config.model;
  if (!modelName) throw new Error('Nessun modello configurato per le curiosità');
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

export async function generateCuriosity(config: AiConfig, abortSignal?: AbortSignal): Promise<string> {
  // Return from cache if available
  if (CACHE.length > 0) {
    const fact = CACHE.shift()!;
    SEEN_CURIOSITIES.add(fact);
    return fact;
  }

  try {
    const alreadySeen = Array.from(SEEN_CURIOSITIES).slice(-20);
    const avoidText = alreadySeen.length > 0
      ? `\n\nEvita queste già dette: ${alreadySeen.join(' | ')}`
      : '';

    const result = await generateText({
      model: buildModel(config),
      system: CURIOSITY_SYSTEM,
      prompt: `Una curiosità sul fisco, le leggi o la burocrazia italiana.${avoidText}`,
      abortSignal,
    });

    const text = result.text.trim();
    SEEN_CURIOSITIES.add(text);
    return text;
  } catch {
    return 'Sapevi che il codice fiscale italiano è stato introdotto nel 1973?';
  }
}

export async function preloadCuriosities(config: AiConfig, count: number = 3, abortSignal?: AbortSignal): Promise<void> {
  for (let i = CACHE.length; i < count; i++) {
    try {
      const fact = await generateCuriosity(config, abortSignal);
      if (!CACHE.includes(fact)) CACHE.push(fact);
    } catch {
      break;
    }
  }
}
