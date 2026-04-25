<script lang="ts">
  import { defaultAiConfig, loadAiConfig, saveAiConfig, type AiConfig } from '$lib/ai-config';
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
  let keepFilesAfterImport = $state(false);

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
    }
  });

  let saved = $state(false);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  async function handleAiSave() {
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
          <AiSettingsFields
            {aiConfig}
            {saved}
            setProvider={(provider) => { aiConfig = { ...aiConfig, provider }; }}
            updateEndpoint={(value) => { aiConfig = { ...aiConfig, endpoint: value }; }}
            updateApiKey={(value) => { aiConfig = { ...aiConfig, apiKey: value }; }}
            updateModel={(value) => { aiConfig = { ...aiConfig, model: value }; }}
            updateOrchestratorModel={(value) => { aiConfig = { ...aiConfig, orchestratorModel: value }; }}
            updateTaskModel={(value) => { aiConfig = { ...aiConfig, taskModel: value }; }}
            updateContextWindow={(value) => { aiConfig = { ...aiConfig, contextWindow: parseInt(value) || 0 }; }}
            saveConfig={handleAiSave}
          />
        {/if}
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
