<script lang="ts">
  import type { AiConfig } from '$lib/ai-config';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Check } from 'lucide-svelte';

  let {
    aiConfig,
    saved,
    setProvider,
    updateEndpoint,
    updateApiKey,
    updateModel,
    updateOrchestratorModel,
    updateTaskModel,
    updateContextWindow,
    saveConfig,
  }: {
    aiConfig: AiConfig;
    saved: boolean;
    setProvider: (provider: 'openai' | 'anthropic') => void;
    updateEndpoint: (value: string) => void;
    updateApiKey: (value: string) => void;
    updateModel: (value: string) => void;
    updateOrchestratorModel: (value: string) => void;
    updateTaskModel: (value: string) => void;
    updateContextWindow: (value: string) => void;
    saveConfig: () => void;
  } = $props();
</script>

<div class="space-y-3">
  <div class="space-y-1.5">
    <Label class="text-xs">Provider</Label>
    <div class="flex gap-2">
      <Button
        variant={aiConfig.provider === 'openai' ? 'default' : 'outline'}
        size="sm"
        class="flex-1 text-xs"
        onclick={() => setProvider('openai')}
      >
        OpenAI
      </Button>
      <Button
        variant={aiConfig.provider === 'anthropic' ? 'default' : 'outline'}
        size="sm"
        class="flex-1 text-xs"
        onclick={() => setProvider('anthropic')}
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
      value={aiConfig.endpoint}
      oninput={(e) => updateEndpoint((e.target as HTMLInputElement).value)}
    />
  </div>

  <div class="space-y-1.5">
    <Label class="text-xs" for="ai-apikey">API Key</Label>
    <Input
      id="ai-apikey"
      type="password"
      class="h-7 text-xs font-mono"
      placeholder="sk-..."
      value={aiConfig.apiKey}
      oninput={(e) => updateApiKey((e.target as HTMLInputElement).value)}
    />
  </div>

  <div class="space-y-1.5">
    <Label class="text-xs" for="ai-model">Modello di default</Label>
    <Input
      id="ai-model"
      class="h-7 text-xs"
      placeholder="gpt-4o"
      value={aiConfig.model}
      oninput={(e) => updateModel((e.target as HTMLInputElement).value)}
    />
  </div>

  <div class="space-y-1.5">
    <Label class="text-xs" for="ai-orchestrator-model">Modello Orchestratore</Label>
    <Input
      id="ai-orchestrator-model"
      class="h-7 text-xs"
      placeholder="Lascia vuoto per usare il modello principale"
      value={aiConfig.orchestratorModel}
      oninput={(e) => updateOrchestratorModel((e.target as HTMLInputElement).value)}
    />
  </div>

  <div class="space-y-1.5">
    <Label class="text-xs" for="ai-task-model">Modello Task</Label>
    <Input
      id="ai-task-model"
      class="h-7 text-xs"
      placeholder="Lascia vuoto per usare il modello principale"
      value={aiConfig.taskModel}
      oninput={(e) => updateTaskModel((e.target as HTMLInputElement).value)}
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
      oninput={(e) => updateContextWindow((e.target as HTMLInputElement).value)}
    />
  </div>

  <Button class="w-full" size="sm" onclick={saveConfig}>
    {#if saved}
      <Check class="mr-1.5 h-3.5 w-3.5" />
      Salvato
    {:else}
      Salva impostazioni AI
    {/if}
  </Button>
</div>
