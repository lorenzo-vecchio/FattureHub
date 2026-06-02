<script lang="ts">
  import { getSyncStatus } from '$lib/api/sync-status.svelte';
  import { isLoggedIn } from '$lib/api/auth.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip';

  let sync = getSyncStatus();
</script>

{#if isLoggedIn()}
  <div class="flex items-center gap-1.5">
    {#if sync.status === 'syncing'}
      <Tooltip.Root>
        <Tooltip.Trigger class="flex items-center gap-1.5">
          <span class="relative flex size-2">
            <span class="absolute inline-flex size-full animate-ping rounded-full bg-yellow-400 opacity-75"></span>
            <span class="relative inline-flex size-2 rounded-full bg-yellow-400"></span>
          </span>
          <span class="text-xs text-muted-foreground hidden sm:inline">Sync...</span>
        </Tooltip.Trigger>
        <Tooltip.Content>Sincronizzazione in corso...</Tooltip.Content>
      </Tooltip.Root>
    {:else if sync.status === 'error'}
      <Tooltip.Root>
        <Tooltip.Trigger class="flex items-center gap-1.5">
          <span class="relative flex size-2">
            <span class="relative inline-flex size-2 rounded-full bg-red-500"></span>
          </span>
          <span class="text-xs text-muted-foreground hidden sm:inline">Errore</span>
        </Tooltip.Trigger>
        <Tooltip.Content>{sync.lastError || 'Errore di sincronizzazione'}</Tooltip.Content>
      </Tooltip.Root>
    {:else if sync.status === 'idle'}
      <Tooltip.Root>
        <Tooltip.Trigger class="flex items-center gap-1.5">
          <span class="relative flex size-2">
            <span class="relative inline-flex size-2 rounded-full bg-green-500"></span>
          </span>
          <span class="text-xs text-muted-foreground hidden sm:inline">In sync</span>
        </Tooltip.Trigger>
        <Tooltip.Content>Dati sincronizzati</Tooltip.Content>
      </Tooltip.Root>
    {/if}
  </div>
{/if}
