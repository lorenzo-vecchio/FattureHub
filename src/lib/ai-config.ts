import { getSetting, setSetting } from './db-sqlite';

export const OLLAMA_DEFAULT_PORT = 11434;

export interface RemoteProviderConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  orchestratorModel: string;
  taskModel: string;
}

export interface OllamaProviderConfig {
  port: number;
  model: string;
  orchestratorModel: string;
  taskModel: string;
}

export type ProviderConfigs = {
  openai: RemoteProviderConfig;
  anthropic: RemoteProviderConfig;
  ollama: OllamaProviderConfig;
};

export const defaultProviderConfigs: ProviderConfigs = {
  openai: { endpoint: '', apiKey: '', model: '', orchestratorModel: '', taskModel: '' },
  anthropic: { endpoint: '', apiKey: '', model: '', orchestratorModel: '', taskModel: '' },
  ollama: { port: OLLAMA_DEFAULT_PORT, model: '', orchestratorModel: '', taskModel: '' },
};

export interface AiConfig {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'ollama';
  /** Active flat fields — consumers read these. Synced from providers[provider]. */
  endpoint: string;
  apiKey: string;
  model: string;
  orchestratorModel: string;
  taskModel: string;
  orchestratorReasoning?: boolean;
  taskReasoning?: boolean;
  /** Per-provider storage — survives provider switches. */
  providers: ProviderConfigs;
  contextWindow: number;
  showCuriosities: boolean;
}

export const defaultAiConfig: AiConfig = {
  enabled: false,
  provider: 'openai',
  endpoint: '',
  apiKey: '',
  model: '',
  orchestratorModel: '',
  taskModel: '',
  contextWindow: 0,
  showCuriosities: true,
  providers: { ...defaultProviderConfigs },
};

/** Copy flat active fields into the current provider's storage. */
export function syncToProviders(config: AiConfig): void {
  if (config.provider === 'ollama') {
    // Extract port from the active endpoint
    const m = config.endpoint.match(/^http:\/\/localhost:(\d+)\/v1\/?$/);
    const p = config.providers.ollama;
    p.port = m ? parseInt(m[1], 10) || OLLAMA_DEFAULT_PORT : p.port;
    p.model = config.model;
    p.orchestratorModel = config.orchestratorModel;
    p.taskModel = config.taskModel;
  } else {
    const p = config.providers[config.provider] as RemoteProviderConfig;
    p.endpoint = config.endpoint;
    p.apiKey = config.apiKey;
    p.model = config.model;
    p.orchestratorModel = config.orchestratorModel;
    p.taskModel = config.taskModel;
  }
}

/** Copy the current provider's storage back into flat active fields. */
export function syncFromProviders(config: AiConfig): void {
  if (config.provider === 'ollama') {
    const p = config.providers.ollama;
    config.endpoint = `http://localhost:${p.port}/v1`;
    config.apiKey = '';
    config.model = p.model;
    config.orchestratorModel = p.orchestratorModel;
    config.taskModel = p.taskModel;
  } else {
    const p = config.providers[config.provider] as RemoteProviderConfig;
    config.endpoint = p.endpoint;
    config.apiKey = p.apiKey;
    config.model = p.model;
    config.orchestratorModel = p.orchestratorModel;
    config.taskModel = p.taskModel;
  }
}

/** Switch provider, saving current state and loading the target's. */
export function switchProvider(config: AiConfig, newProvider: 'openai' | 'anthropic' | 'ollama'): void {
  syncToProviders(config);
  config.provider = newProvider;
  syncFromProviders(config);
}

function migrateLegacy(raw: Record<string, unknown>): void {
  if (raw.providers) return; // already migrated
  const provider = (raw.provider as string) || 'openai';
  const cfg: ProviderConfigs = {
    openai: { endpoint: '', apiKey: '', model: '', orchestratorModel: '', taskModel: '' },
    anthropic: { endpoint: '', apiKey: '', model: '', orchestratorModel: '', taskModel: '' },
    ollama: { port: OLLAMA_DEFAULT_PORT, model: '', orchestratorModel: '', taskModel: '' },
  };
  if (provider === 'ollama') {
    cfg.ollama.model = (raw.model as string) ?? '';
    cfg.ollama.orchestratorModel = (raw.orchestratorModel as string) ?? '';
    cfg.ollama.taskModel = (raw.taskModel as string) ?? '';
    const ep = (raw.endpoint as string) ?? '';
    const m = ep.match(/^http:\/\/localhost:(\d+)\/v1\/?$/);
    if (m) cfg.ollama.port = parseInt(m[1], 10);
  } else {
    const p = cfg[provider as 'openai' | 'anthropic'];
    p.endpoint = (raw.endpoint as string) ?? '';
    p.apiKey = (raw.apiKey as string) ?? '';
    p.model = (raw.model as string) ?? '';
    p.orchestratorModel = (raw.orchestratorModel as string) ?? '';
    p.taskModel = (raw.taskModel as string) ?? '';
  }
  raw.providers = cfg;
  delete raw.endpoint;
  delete raw.apiKey;
  delete raw.model;
  delete raw.orchestratorModel;
  delete raw.taskModel;
}

export async function loadAiConfig(): Promise<AiConfig> {
  try {
    const configJson = await getSetting('aiConfig');
    if (configJson) {
      const raw = JSON.parse(configJson);
      migrateLegacy(raw);
      const cfg = { ...defaultAiConfig, ...raw } as AiConfig;
      // Ensure flat fields are in sync after load
      syncFromProviders(cfg);
      return cfg;
    }
    return { ...defaultAiConfig, providers: { ...defaultProviderConfigs } };
  } catch {
    return { ...defaultAiConfig, providers: { ...defaultProviderConfigs } };
  }
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  // Flatten current provider state before saving
  syncToProviders(config);
  // Store flat fields too so consumers can read them directly on next load
  const store: Record<string, unknown> = { ...config, providers: config.providers };
  await setSetting('aiConfig', JSON.stringify(store));
}
