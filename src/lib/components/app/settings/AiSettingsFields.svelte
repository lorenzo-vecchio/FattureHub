<script lang="ts">
  import type { AiConfig } from '$lib/ai-config';
  import type { AvailableModel } from '$lib/ai-models';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Check } from 'lucide-svelte';

  let {
    aiConfig,
    availableModels = [],
    modelLoading = false,
    modelError = null,
    saved,
    setProvider,
    updateEndpoint,
    updateApiKey,
    updateModel,
    updateOrchestratorModel,
    updateOrchestratorReasoning,
    updateTaskModel,
    updateTaskReasoning,
    updateContextWindow,
    saveConfig,
  }: {
    aiConfig: AiConfig;
    availableModels?: AvailableModel[];
    modelLoading?: boolean;
    modelError?: string | null;
    saved: boolean;
    setProvider: (provider: 'openai' | 'anthropic') => void;
    updateEndpoint: (value: string) => void;
    updateApiKey: (value: string) => void;
    updateModel: (value: string) => void;
    updateOrchestratorModel: (value: string) => void;
    updateOrchestratorReasoning: (value: boolean) => void;
    updateTaskModel: (value: string) => void;
    updateTaskReasoning: (value: boolean) => void;
    updateContextWindow: (value: string) => void;
    saveConfig: () => void;
  } = $props();

  function isModelListed(modelId: string): boolean {
    return availableModels.some((model) => model.id === modelId);
  }
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
    {#if availableModels.length > 0}
      <select
        id="ai-model"
        class="h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        value={aiConfig.model}
        onchange={(e) => updateModel((e.currentTarget as HTMLSelectElement).value)}
      >
        <option value="">Seleziona un modello</option>
        {#if aiConfig.model && !isModelListed(aiConfig.model)}
          <option value={aiConfig.model}>{aiConfig.model} (attuale)</option>
        {/if}
        {#each availableModels as model}
          <option value={model.id}>{model.id}{model.reasoning ? ' (reasoning)' : ''}</option>
        {/each}
      </select>
    {:else}
      <Input
        id="ai-model"
        class="h-7 text-xs"
        placeholder="gpt-4o"
        value={aiConfig.model}
        oninput={(e) => updateModel((e.target as HTMLInputElement).value)}
      />
    {/if}

    {#if modelLoading}
      <p class="text-[11px] text-muted-foreground">Carico i modelli disponibili...</p>
    {:else if modelError}
      <p class="text-[11px] text-destructive">{modelError}</p>
    {:else if availableModels.length > 0}
      <p class="text-[11px] text-muted-foreground">I modelli vengono aggiornati automaticamente quando cambi endpoint o API key.</p>
    {/if}
  </div>

  <details class="rounded-lg border border-dashed border-border/70 px-3 py-2">
    <summary class="cursor-pointer text-xs font-medium text-foreground">Impostazioni avanzate</summary>

    <div class="mt-4 space-y-4">
      <div class="space-y-1.5">
        <Label class="text-xs" for="ai-orchestrator-model">Modello orchestrazione</Label>
        {#if availableModels.length > 0}
          <select
            id="ai-orchestrator-model"
            class="h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={aiConfig.orchestratorModel}
            onchange={(e) => updateOrchestratorModel((e.currentTarget as HTMLSelectElement).value)}
          >
            <option value="">Usa il modello principale</option>
            {#if aiConfig.orchestratorModel && !isModelListed(aiConfig.orchestratorModel)}
              <option value={aiConfig.orchestratorModel}>{aiConfig.orchestratorModel} (attuale)</option>
            {/if}
            {#each availableModels as model}
              <option value={model.id}>{model.id}{model.reasoning ? ' (reasoning)' : ''}</option>
            {/each}
          </select>
        {:else}
          <Input
            id="ai-orchestrator-model"
            class="h-7 text-xs"
            placeholder="Lascia vuoto per usare il modello principale"
            value={aiConfig.orchestratorModel}
            oninput={(e) => updateOrchestratorModel((e.target as HTMLInputElement).value)}
          />
        {/if}

        <label class="flex items-start gap-2 text-[11px] leading-4 text-muted-foreground">
          <input
            type="checkbox"
            class="mt-0.5 h-3.5 w-3.5 rounded border-border"
            checked={aiConfig.orchestratorReasoning ?? false}
            onchange={(e) => updateOrchestratorReasoning((e.currentTarget as HTMLInputElement).checked)}
          />
          <span>
            Abilita reasoning sull'orchestrazione.
            <span class="block">Se lasci vuoto questo campo, l'orchestrazione usa il reasoning automaticamente con il modello principale.</span>
          </span>
        </label>
      </div>

      <div class="space-y-1.5">
        <Label class="text-xs" for="ai-task-model">Modello task</Label>
        {#if availableModels.length > 0}
          <select
            id="ai-task-model"
            class="h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={aiConfig.taskModel}
            onchange={(e) => updateTaskModel((e.currentTarget as HTMLSelectElement).value)}
          >
            <option value="">Usa il modello principale</option>
            {#if aiConfig.taskModel && !isModelListed(aiConfig.taskModel)}
              <option value={aiConfig.taskModel}>{aiConfig.taskModel} (attuale)</option>
            {/if}
            {#each availableModels as model}
              <option value={model.id}>{model.id}{model.reasoning ? ' (reasoning)' : ''}</option>
            {/each}
          </select>
        {:else}
          <Input
            id="ai-task-model"
            class="h-7 text-xs"
            placeholder="Lascia vuoto per usare il modello principale"
            value={aiConfig.taskModel}
            oninput={(e) => updateTaskModel((e.target as HTMLInputElement).value)}
          />
        {/if}

        <label class="flex items-start gap-2 text-[11px] leading-4 text-muted-foreground">
          <input
            type="checkbox"
            class="mt-0.5 h-3.5 w-3.5 rounded border-border"
            checked={aiConfig.taskReasoning ?? false}
            onchange={(e) => updateTaskReasoning((e.currentTarget as HTMLInputElement).checked)}
          />
          <span>
            Abilita reasoning sui task quando usi un modello dedicato.
          </span>
        </label>
      </div>
    </div>
  </details>

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
