<script lang="ts">
  import { setMode, resetMode, userPrefersMode } from 'mode-watcher';
  import * as Sheet from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Separator } from '$lib/components/ui/separator';
  import { Settings, Sun, Moon, Monitor, Check } from 'lucide-svelte';
  import { loadAiConfig, saveAiConfig, defaultAiConfig, type AiConfig } from '$lib/ai-config';

  let {
    open = $bindable(false),
    onAiConfigChange,
  }: {
    open: boolean;
    onAiConfigChange?: (config: AiConfig) => void;
  } = $props();

  let aiConfig = $state<AiConfig>({ ...defaultAiConfig });

  function handleOpenChange(v: boolean) {
    open = v;
  }

  $effect(() => {
    if (open) {
      loadAiConfig().then((cfg) => {
        aiConfig = cfg;
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

  const themes = [
    { value: 'light', label: 'Chiaro', icon: Sun },
    { value: 'dark', label: 'Scuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ] as const;

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
      <!-- Theme -->
      <div class="space-y-3">
        <p class="text-sm font-medium">Tema</p>
        <div class="flex gap-2">
          {#each themes as theme}
            {@const active = userPrefersMode.current === theme.value}
            <Button
              variant={active ? 'default' : 'outline'}
              class="flex-1 flex-col h-auto py-3 gap-1.5"
              onclick={() => selectTheme(theme.value)}
            >
              <theme.icon class="h-4 w-4" />
              <span class="text-xs">{theme.label}</span>
            </Button>
          {/each}
        </div>
      </div>

      <Separator />

      <!-- AI Settings -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">Assistente AI</p>
          <button
            role="switch"
            aria-checked={aiConfig.enabled}
            aria-label="Abilita assistente AI"
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {aiConfig.enabled ? 'bg-primary' : 'bg-input'}"
            onclick={async () => {
              aiConfig = { ...aiConfig, enabled: !aiConfig.enabled };
              await saveAiConfig(aiConfig);
              onAiConfigChange?.(aiConfig);
            }}
          >
            <span
              class="pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {aiConfig.enabled ? 'translate-x-4' : 'translate-x-0'}"
            ></span>
          </button>
        </div>

        {#if aiConfig.enabled}
          <div class="space-y-3">
            <div class="space-y-1.5">
              <Label class="text-xs">Provider</Label>
              <div class="flex gap-2">
                <Button
                  variant={aiConfig.provider === 'openai' ? 'default' : 'outline'}
                  size="sm"
                  class="flex-1 text-xs"
                  onclick={() => { aiConfig = { ...aiConfig, provider: 'openai' }; }}
                >
                  OpenAI
                </Button>
                <Button
                  variant={aiConfig.provider === 'anthropic' ? 'default' : 'outline'}
                  size="sm"
                  class="flex-1 text-xs"
                  onclick={() => { aiConfig = { ...aiConfig, provider: 'anthropic' }; }}
                >
                  Anthropic
                </Button>
              </div>
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs" for="ai-endpoint">Endpoint (opzionale)</Label>
              <Input
                id="ai-endpoint"
                class="h-7 text-xs"
                placeholder="https://api.openai.com/v1"
                bind:value={aiConfig.endpoint}
              />
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs" for="ai-apikey">API Key</Label>
              <Input
                id="ai-apikey"
                type="password"
                class="h-7 text-xs font-mono"
                placeholder="sk-..."
                bind:value={aiConfig.apiKey}
              />
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs" for="ai-model">Modello di default</Label>
              <Input
                id="ai-model"
                class="h-7 text-xs"
                placeholder="gpt-4o"
                bind:value={aiConfig.model}
              />
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs" for="ai-orchestrator-model">Modello Orchestratore</Label>
              <Input
                id="ai-orchestrator-model"
                class="h-7 text-xs"
                placeholder="Lascia vuoto per usare il modello principale"
                bind:value={aiConfig.orchestratorModel}
              />
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs" for="ai-task-model">Modello Task</Label>
              <Input
                id="ai-task-model"
                class="h-7 text-xs"
                placeholder="Lascia vuoto per usare il modello principale"
                bind:value={aiConfig.taskModel}
              />
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs" for="ai-context-window">Context Window (token, 0 = illimitato)</Label>
              <Input
                id="ai-context-window"
                type="number"
                class="h-7 text-xs"
                placeholder="0"
                value={aiConfig.contextWindow}
                oninput={(e) => { aiConfig = { ...aiConfig, contextWindow: parseInt(e.currentTarget.value) || 0 }; }}
              />
            </div>

            <Button class="w-full" size="sm" onclick={handleAiSave}>
              {#if saved}
                <Check class="mr-1.5 h-3.5 w-3.5" />
                Salvato
              {:else}
                Salva impostazioni AI
              {/if}
            </Button>
          </div>
        {/if}
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
