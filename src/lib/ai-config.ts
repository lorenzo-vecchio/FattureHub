import { getSetting, setSetting } from './db-sqlite';

export interface AiConfig {
  enabled: boolean;
  provider: 'openai' | 'anthropic';
  endpoint: string;
  apiKey: string;
  model: string;
  orchestratorModel: string;
  taskModel: string;
  contextWindow: number;
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
};

export async function loadAiConfig(): Promise<AiConfig> {
  try {
    const configJson = await getSetting('aiConfig');
    if (configJson) {
      return { ...defaultAiConfig, ...JSON.parse(configJson) } as AiConfig;
    }
    return { ...defaultAiConfig };
  } catch {
    return { ...defaultAiConfig };
  }
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  await setSetting('aiConfig', JSON.stringify(config));
}
