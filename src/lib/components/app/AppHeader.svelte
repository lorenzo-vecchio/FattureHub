<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import HeaderActions from './header/HeaderActions.svelte';
  import HeaderProjectStatus from './header/HeaderProjectStatus.svelte';

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
        <HeaderProjectStatus {isDirty} {isAiRunning} {currentProjectName} />
      {/if}
    </div>

    <HeaderActions
      {fattureCount}
      {aiEnabled}
      {isAiRunning}
      openAi={openai}
      openProjects={onopenprojects}
      openSettings={opensettings}
      clearProject={onclear}
    />
  </div>
</header>
