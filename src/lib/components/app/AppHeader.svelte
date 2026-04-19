<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { X, FolderArchive, Settings, Sparkles, Loader } from 'lucide-svelte';

  let {
    fattureCount,
    activeFilters,
    isDirty,
    currentProjectName,
    aiEnabled,
    isAiRunning,
    onclear,
    onopenprojects,
    opensettings,
    openai,
  }: {
    fattureCount: number;
    activeFilters: number;
    isDirty: boolean;
    currentProjectName: string | null;
    aiEnabled: boolean;
    isAiRunning: boolean;
    onclear: () => void;
    onopenprojects: () => void;
    opensettings: () => void;
    openai: () => void;
  } = $props();
</script>

<header class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
  <div class="mx-auto max-w-7xl flex h-14 items-center justify-between px-6">
    <div class="flex items-center gap-3">
      <h1 class="text-base font-semibold">FattureHub</h1>

      {#if fattureCount > 0}
        <Badge variant="secondary">{fattureCount} caricate</Badge>
      {/if}
      {#if activeFilters > 0}
        <Badge>{activeFilters} filtri attivi</Badge>
      {/if}

      {#if currentProjectName || (isDirty && fattureCount > 0)}
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          {#if isDirty || isAiRunning}
            <span class="h-1.5 w-1.5 rounded-full {isAiRunning ? 'bg-blue-400 animate-pulse' : 'bg-amber-400'} shrink-0"></span>
          {/if}
          <span class="max-w-[200px] truncate">
            {currentProjectName ?? 'Non salvato'}
          </span>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-2">
       {#if aiEnabled && fattureCount > 0}
        <Button
          variant={isAiRunning ? 'secondary' : 'ghost'}
          size="sm"
          onclick={openai}
          title="Assistente AI"
        >
          {#if isAiRunning}
            <Loader class="mr-1.5 h-3.5 w-3.5 animate-spin" />
          {:else}
            <Sparkles class="mr-1.5 h-3.5 w-3.5" />
          {/if}
          AI
        </Button>
      {/if}
      {#if fattureCount > 0}
        <Button variant="ghost" size="sm" onclick={onopenprojects}>
          <FolderArchive class="mr-1.5 h-3.5 w-3.5" />
          Progetti
        </Button>
      {/if}
      <Button variant="ghost" size="icon" onclick={opensettings} title="Impostazioni">
        <Settings class="h-4 w-4" />
      </Button>
      {#if fattureCount > 0}
        <Button variant="ghost" size="sm" onclick={onclear}>
          <X class="mr-1.5 h-3.5 w-3.5" />
          Chiudi progetto
        </Button>
      {/if}
    </div>
  </div>
</header>
