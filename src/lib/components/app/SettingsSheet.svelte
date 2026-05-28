<script lang="ts">
  import { defaultAiConfig, loadAiConfig, saveAiConfig, type AiConfig } from '$lib/ai-config';
  import { fetchAvailableModels, suggestDefaultModel, type AvailableModel } from '$lib/ai-models';
  import { Separator } from '$lib/components/ui/separator';
  import * as Sheet from '$lib/components/ui/sheet';
  import { getSetting, setSetting } from '$lib/db-sqlite';
  import { Brain, LogOut, Mail, Settings, User as UserIcon } from 'lucide-svelte';
  import { resetMode, setMode, userPrefersMode } from 'mode-watcher';
  import AiSettingsFields from './settings/AiSettingsFields.svelte';
  import SwitchRow from './settings/SwitchRow.svelte';
  import ThemeSelector from './settings/ThemeSelector.svelte';
  import { isLoggedIn, logout, getApi } from '$lib/api/auth.svelte';
  import { open as openExternal } from '@tauri-apps/plugin-shell';

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

  let accountInfo = $state<{ email: string; name: string } | null>(null);
  let creditInfo = $state<{ balance: number; monthly_allowance: number; subscription_status: string } | null>(null);
  let accountLoading = $state(false);

  function handleOpenChange(v: boolean) {
    open = v;
  }

  async function loadAccountData() {
    if (!isLoggedIn()) return;
    accountLoading = true;
    try {
      const api = getApi();
      const [me, credits] = await Promise.all([
        api.getMe(),
        api.getCredits(),
      ]);
      accountInfo = { email: me.email, name: me.name };
      creditInfo = credits;
    } catch {
      accountInfo = null;
      creditInfo = null;
    } finally {
      accountLoading = false;
    }
  }

  $effect(() => {
    if (open) {
      loadAiConfig().then((cfg) => {
        aiConfig = cfg;
      });

      getSetting('keepFilesAfterImport').then((value) => {
        keepFilesAfterImport = value === 'true';
      });

      loadAccountData();
    }
  });

  $effect(() => {
    if (!open || isLoggedIn()) return;

    const endpoint = aiConfig.endpoint.trim();
    const apiKey = aiConfig.apiKey.trim();
    const provider = aiConfig.provider;

    if (!endpoint || !apiKey) {
      availableModels = [];
      modelError = null;
      modelLoading = false;
      lastModelFetchKey = '';
      return;
    }

    const fetchKey = `${provider}|${endpoint}|${apiKey}`;
    if (fetchKey === lastModelFetchKey) return;

    modelLoading = true;
    modelError = null;

    const timer = setTimeout(async () => {
      try {
        const models = await fetchAvailableModels({ provider, endpoint, apiKey });
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

  async function handleLogout() {
    await logout();
    accountInfo = null;
    creditInfo = null;
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

      {#if isLoggedIn()}
        <Separator />

        <!-- Account Info -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold">Account</h3>
          {#if accountLoading}
            <p class="text-sm text-muted-foreground">Caricamento...</p>
          {:else if accountInfo}
            <div class="space-y-2 rounded-lg border p-3">
              <div class="flex items-center gap-2 text-sm">
                <UserIcon class="size-4 text-muted-foreground" />
                <span>{accountInfo.name || accountInfo.email}</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <Mail class="size-4 text-muted-foreground" />
                <span class="text-muted-foreground">{accountInfo.email}</span>
              </div>
              {#if creditInfo}
                <Separator />
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted-foreground">Crediti AI</span>
                  <span class="font-bold">{creditInfo.balance}</span>
                </div>
                {#if creditInfo.subscription_status === 'active'}
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Crediti/mese</span>
                    <span>+{creditInfo.monthly_allowance}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Stato</span>
                    <span class="text-green-600">Attivo</span>
                  </div>
                {:else}
                  <p class="text-xs text-muted-foreground">Nessun abbonamento attivo</p>
                {/if}
              {/if}
            </div>

            <button
              onclick={() => openExternal('http://localhost:5174/settings')}
              class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Gestisci abbonamento
            </button>

            <button
              onclick={handleLogout}
              class="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut class="size-4" />
              Esci
            </button>
          {/if}
        </div>
      {:else}
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
              {availableModels}
              {modelLoading}
              {modelError}
              {saved}
              setProvider={(provider) => { aiConfig = { ...aiConfig, provider }; }}
              updateEndpoint={(value) => { aiConfig = { ...aiConfig, endpoint: value }; }}
              updateApiKey={(value) => { aiConfig = { ...aiConfig, apiKey: value }; }}
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
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
