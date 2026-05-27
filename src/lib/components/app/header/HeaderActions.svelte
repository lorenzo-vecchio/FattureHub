<script lang="ts">
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import { Button } from '$lib/components/ui/button';
  import { FolderArchive, Loader, LogIn, LogOut, Settings, Sparkles, X } from 'lucide-svelte';

  let {
    fattureCount,
    aiEnabled,
    isAiRunning,
    openAi,
    openProjects,
    openSettings,
    clearProject,
  }: {
    fattureCount: number;
    aiEnabled: boolean;
    isAiRunning: boolean;
    openAi: () => void;
    openProjects: () => void;
    openSettings: () => void;
    clearProject: () => void;
  } = $props();

  let isLoggedIn = $state(api.isLoggedIn());

  async function handleLogout() {
    await api.logout();
    isLoggedIn = false;
    goto('/');
  }
</script>

<div class="flex items-center gap-2">
  {#if isLoggedIn}
    <Button variant="ghost" size="sm" onclick={handleLogout} title="Disconnetti">
      <LogOut class="mr-1.5 h-3.5 w-3.5" />
      Esci
    </Button>
  {:else}
    <Button variant="ghost" size="sm" onclick={() => goto('/login')} title="Accedi">
      <LogIn class="mr-1.5 h-3.5 w-3.5" />
      Accedi
    </Button>
  {/if}

  {#if aiEnabled && fattureCount > 0}
    <Button
      variant={isAiRunning ? 'secondary' : 'ghost'}
      size="sm"
      onclick={openAi}
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
    <Button variant="ghost" size="sm" onclick={openProjects}>
      <FolderArchive class="mr-1.5 h-3.5 w-3.5" />
      Progetti
    </Button>
  {/if}
  <Button variant="ghost" size="icon" onclick={openSettings} title="Impostazioni">
    <Settings class="h-4 w-4" />
  </Button>
  {#if fattureCount > 0}
    <Button variant="ghost" size="sm" onclick={clearProject}>
      <X class="mr-1.5 h-3.5 w-3.5" />
      Chiudi progetto
    </Button>
  {/if}
</div>
