<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';
  import { defaultAiConfig, loadAiConfig, saveAiConfig, switchProvider, syncToProviders, type AiConfig } from '$lib/ai-config';
  import { fetchAvailableModels, suggestDefaultModel, type AvailableModel } from '$lib/ai-models';
  import { Separator } from '$lib/components/ui/separator';
  import * as Sheet from '$lib/components/ui/sheet';
  import { getSetting, setSetting } from '$lib/db-sqlite';
  import { Settings } from 'lucide-svelte';
  import { resetMode, setMode, userPrefersMode } from 'mode-watcher';
  import AiSettingsFields from './settings/AiSettingsFields.svelte';
  import SwitchRow from './settings/SwitchRow.svelte';
  import ThemeSelector from './settings/ThemeSelector.svelte';

  let {
    open = $bindable(false),
    onAiConfigChange,
  }: {
    open: boolean;
    onAiConfigChange?: (config: AiConfig) => void;
  } = $props();

  let aiConfig = $state<AiConfig>({ ...defaultAiConfig });
  let availableModels = $state<AvailableModel[]>([]);
  let modelLoading = $state(false);
  let modelError = $state<string | null>(null);
  let lastModelFetchKey = '';
  let keepFilesAfterImport = $state(false);

  let appVersion = $state('');

  function handleOpenChange(v: boolean) {
    open = v;
  }

  $effect(() => {
    if (open) {
      loadAiConfig().then((cfg) => {
        aiConfig = cfg;
      });

      getSetting('keepFilesAfterImport').then((value) => {
        keepFilesAfterImport = value === 'true';
      });

      getVersion().then((v) => { appVersion = v; });
    }
  });

  $effect(() => {
    if (!open) return;
    if (!aiConfig.enabled) {
      availableModels = [];
      modelError = null;
      modelLoading = false;
      lastModelFetchKey = '';
      return;
    }

    const endpoint = aiConfig.endpoint.trim();
    const provider = aiConfig.provider;

    // Ollama doesn't require an API key
    if (!endpoint || (provider !== 'ollama' && !aiConfig.apiKey.trim())) {
      availableModels = [];
      modelError = null;
      modelLoading = false;
      lastModelFetchKey = '';
      return;
    }

    const fetchKey = `${provider}|${endpoint}|${aiConfig.apiKey}`;
    if (fetchKey === lastModelFetchKey) return;

    modelLoading = true;
    modelError = null;

    const timer = setTimeout(async () => {
      try {
        const models = await fetchAvailableModels({ provider, endpoint, apiKey: aiConfig.apiKey });
        lastModelFetchKey = fetchKey;
        availableModels = models;

        const suggestedModel = suggestDefaultModel(models);
        if (!aiConfig.model && suggestedModel) {
          aiConfig = { ...aiConfig, model: suggestedModel };
        }
      } catch (error) {
        lastModelFetchKey = '';
        availableModels = [];
        modelError = error instanceof Error ? error.message : 'Impossibile caricare i modelli disponibili.';
      } finally {
        modelLoading = false;
      }
    }, 400);

    return () => clearTimeout(timer);
  });

  let saved = $state(false);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  async function handleAiSave() {
    syncToProviders(aiConfig);
    await saveAiConfig(aiConfig);
    onAiConfigChange?.(aiConfig);
    saved = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saved = false; }, 2000);
  }

  function selectTheme(value: 'light' | 'dark' | 'system') {
    if (value === 'system') resetMode();
    else setMode(value);
  }
</script>

<Sheet.Root open={open} onOpenChange={handleOpenChange}>
  <Sheet.Content side="right" class="flex w-[320px] flex-col gap-0 p-0 sm:max-w-[320px]">
    <Sheet.Header class="border-b px-6 py-4">
      <Sheet.Title class="flex items-center gap-2">
        <Settings class="h-4 w-4" />
        Impostazioni
      </Sheet.Title>
    </Sheet.Header>

    <div class="px-6 py-5 space-y-6 overflow-y-auto">
      <ThemeSelector currentTheme={userPrefersMode.current} {selectTheme} />

      <Separator />

      <SwitchRow
        title="Archivia file importati"
        description="Conserva una copia compressa dei file XML dopo l'importazione"
        checked={keepFilesAfterImport}
        label="Archivia file importati"
        toggle={async () => {
          keepFilesAfterImport = !keepFilesAfterImport;
          await setSetting('keepFilesAfterImport', keepFilesAfterImport ? 'true' : 'false');
        }}
      />

      <Separator />

      <!-- AI Settings -->
      <div class="space-y-4">
        <SwitchRow
          title="Assistente AI"
          description="Abilita o disabilita l'assistente AI nel progetto"
          checked={aiConfig.enabled}
          label="Abilita assistente AI"
          toggle={async () => {
            aiConfig = { ...aiConfig, enabled: !aiConfig.enabled };
            await saveAiConfig(aiConfig);
            onAiConfigChange?.(aiConfig);
          }}
        />

        {#if aiConfig.enabled}
          <SwitchRow
            title="Curiosità sul fisco italiano"
            description="Mostra curiosità su leggi, fisco e burocrazia italiana durante le analisi lunghe"
            checked={aiConfig.showCuriosities}
            label="Mostra curiosità"
            toggle={async () => {
              aiConfig = { ...aiConfig, showCuriosities: !aiConfig.showCuriosities };
              await saveAiConfig(aiConfig);
              onAiConfigChange?.(aiConfig);
            }}
          />

          <Separator />

          <AiSettingsFields
            {aiConfig}
            {availableModels}
            {modelLoading}
            {modelError}
            {saved}
            setProvider={(provider) => { switchProvider(aiConfig, provider); }}
            updateEndpoint={(value) => { aiConfig = { ...aiConfig, endpoint: value }; }}
            updateApiKey={(value) => { aiConfig = { ...aiConfig, apiKey: value }; }}
            updateOllamaPort={(value) => {
              const port = parseInt(value) || 11434;
              aiConfig = {
                ...aiConfig,
                providers: {
                  ...aiConfig.providers,
                  ollama: { ...aiConfig.providers.ollama, port },
                },
                endpoint: `http://localhost:${port}/v1`,
              };
            }}
            updateModel={(value) => { aiConfig = { ...aiConfig, model: value }; }}
            updateOrchestratorModel={(value) => { aiConfig = { ...aiConfig, orchestratorModel: value }; }}
            updateOrchestratorReasoning={(value) => { aiConfig = { ...aiConfig, orchestratorReasoning: value }; }}
            updateTaskModel={(value) => { aiConfig = { ...aiConfig, taskModel: value }; }}
            updateTaskReasoning={(value) => { aiConfig = { ...aiConfig, taskReasoning: value }; }}
            updateContextWindow={(value) => { aiConfig = { ...aiConfig, contextWindow: parseInt(value) || 0 }; }}
            saveConfig={handleAiSave}
          />
        {/if}
      </div>
    </div>
    <div class="px-6 pb-3 pt-1">
      <p class="text-[10px] text-muted-foreground/50 text-center">v{appVersion}</p>
    </div>
  </Sheet.Content>
</Sheet.Root>
