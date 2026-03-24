import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

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

async function configPath(): Promise<string> {
  const base = await appDataDir();
  return join(base, 'ai-config.json');
}

export async function loadAiConfig(): Promise<AiConfig> {
  try {
    const path = await configPath();
    const raw = await readTextFile(path);
    return { ...defaultAiConfig, ...JSON.parse(raw) } as AiConfig;
  } catch {
    return { ...defaultAiConfig };
  }
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  const path = await configPath();
  await writeTextFile(path, JSON.stringify(config));
}
