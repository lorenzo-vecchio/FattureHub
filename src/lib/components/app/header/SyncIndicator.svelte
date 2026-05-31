<script lang="ts">
  import { getSyncStatus } from '$lib/api/sync-status.svelte';
  import { isLoggedIn } from '$lib/api/auth.svelte';

  let sync = getSyncStatus();
</script>

{#if isLoggedIn()}
  <div class="flex items-center gap-1.5">
    {#if sync.status === 'syncing'}
      <span class="relative flex size-2">
        <span class="absolute inline-flex size-full animate-ping rounded-full bg-yellow-400 opacity-75"></span>
        <span class="relative inline-flex size-2 rounded-full bg-yellow-400"></span>
      </span>
      <span class="text-xs text-muted-foreground hidden sm:inline">Sync...</span>
    {:else if sync.status === 'error'}
      <span class="relative flex size-2">
        <span class="relative inline-flex size-2 rounded-full bg-red-500"></span>
      </span>
      <span class="text-xs text-muted-foreground hidden sm:inline" title={sync.lastError ?? ''}>Errore</span>
    {:else if sync.status === 'idle'}
      <span class="relative flex size-2">
        <span class="relative inline-flex size-2 rounded-full bg-green-500"></span>
      </span>
      <span class="text-xs text-muted-foreground hidden sm:inline">In sync</span>
    {/if}
  </div>
{/if}
