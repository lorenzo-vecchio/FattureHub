import type { AiConfig } from './ai-config';
import { tauriFetch } from './ai-fetch';

export type AvailableModel = {
  id: string;
  reasoning: boolean;
};

function buildModelsUrl(endpoint: string, provider: AiConfig['provider']): string {
  // Ollama uses /api/tags (not /v1/models) for listing installed models
  if (provider === 'ollama') {
    const base = endpoint.replace(/\/+$/, '').replace(/\/v1\/?$/, '');
    return `${base}/api/tags`;
  }
  return `${endpoint.replace(/\/+$/, '')}/models`;
}

function isReasoningModel(provider: AiConfig['provider'], modelId: string): boolean {
  const normalized = modelId.toLowerCase();

  if (provider === 'anthropic') {
    return normalized.startsWith('claude-');
  }

  if (provider === 'ollama') {
    return normalized.includes('reasoning') || normalized.startsWith('deepseek-r');
  }

  return /^(gpt-5|o1|o3|o4)/.test(normalized) || normalized.includes('reasoning');
}

function getModelLabel(provider: AiConfig['provider'], modelId: string): string {
  return isReasoningModel(provider, modelId) ? `${modelId} · reasoning` : modelId;
}

function extractModelIds(payload: unknown, provider: AiConfig['provider']): string[] {
  if (!payload || typeof payload !== 'object') return [];

  // Ollama /api/tags: { "models": [{ "name": "llama3.2:latest", ... }] }
  if (provider === 'ollama') {
    const models = (payload as Record<string, unknown>).models;
    if (!Array.isArray(models)) return [];
    return models
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const name = (item as Record<string, unknown>).name;
        return typeof name === 'string' ? name.trim() : null;
      })
      .filter((id): id is string => Boolean(id));
  }

  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const candidate = record.id ?? record.name ?? record.model ?? record.slug;
      return typeof candidate === 'string' ? candidate.trim() : null;
    })
    .filter((id): id is string => Boolean(id));
}

export function suggestDefaultModel(models: AvailableModel[]): string {
  return models.find(model => model.reasoning)?.id ?? models[0]?.id ?? '';
}

export async function fetchAvailableModels(config: Pick<AiConfig, 'provider' | 'endpoint' | 'apiKey'>): Promise<AvailableModel[]> {
  const endpoint = config.endpoint.trim();
  if (!endpoint) return [];

  // Ollama doesn't require an API key
  if (config.provider !== 'ollama') {
    const apiKey = config.apiKey.trim();
    if (!apiKey) return [];
  }

  const response = await tauriFetch(buildModelsUrl(endpoint, config.provider), {
    headers: config.provider === 'anthropic'
      ? {
          'x-api-key': config.apiKey.trim(),
          'anthropic-version': '2023-06-01',
        }
      : config.provider === 'ollama'
        ? {}
        : {
            Authorization: `Bearer ${config.apiKey.trim()}`,
          },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Impossibile caricare i modelli: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`);
  }

  const payload = await response.json().catch(() => null);
  const uniqueIds = Array.from(new Set(extractModelIds(payload, config.provider))).sort((a, b) => a.localeCompare(b, 'it'));

  return uniqueIds.map((id) => ({
    id,
    reasoning: isReasoningModel(config.provider, id),
  })).sort((a, b) => {
    if (a.reasoning !== b.reasoning) return a.reasoning ? -1 : 1;
    return getModelLabel(config.provider, a.id).localeCompare(getModelLabel(config.provider, b.id), 'it');
  });
}
