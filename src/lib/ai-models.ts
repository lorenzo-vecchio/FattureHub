import type { AiConfig } from './ai-config';
import { tauriFetch } from './ai-fetch';

export type AvailableModel = {
  id: string;
  reasoning: boolean;
};

function buildModelsUrl(endpoint: string): string {
  return `${endpoint.replace(/\/+$/, '')}/models`;
}

function isReasoningModel(provider: AiConfig['provider'], modelId: string): boolean {
  const normalized = modelId.toLowerCase();

  if (provider === 'anthropic') {
    return normalized.startsWith('claude-');
  }

  return /^(gpt-5|o1|o3|o4)/.test(normalized) || normalized.includes('reasoning');
}

function getModelLabel(provider: AiConfig['provider'], modelId: string): string {
  return isReasoningModel(provider, modelId) ? `${modelId} · reasoning` : modelId;
}

function extractModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
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
  const apiKey = config.apiKey.trim();
  if (!endpoint || !apiKey) return [];

  const response = await tauriFetch(buildModelsUrl(endpoint), {
    headers: config.provider === 'anthropic'
      ? {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        }
      : {
          Authorization: `Bearer ${apiKey}`,
        },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Impossibile caricare i modelli: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`);
  }

  const payload = await response.json().catch(() => null);
  const uniqueIds = Array.from(new Set(extractModelIds(payload))).sort((a, b) => a.localeCompare(b, 'it'));

  return uniqueIds.map((id) => ({
    id,
    reasoning: isReasoningModel(config.provider, id),
  })).sort((a, b) => {
    if (a.reasoning !== b.reasoning) return a.reasoning ? -1 : 1;
    return getModelLabel(config.provider, a.id).localeCompare(getModelLabel(config.provider, b.id), 'it');
  });
}
