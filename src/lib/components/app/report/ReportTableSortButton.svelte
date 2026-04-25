<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-svelte';

  let {
    label,
    active,
    direction,
    toggle,
  }: {
    label: string;
    active: boolean;
    direction: 'asc' | 'desc';
    toggle: () => void;
  } = $props();
</script>

<Button
  variant="ghost"
  size="sm"
  class="h-auto px-1 py-0 text-xs font-medium"
  onclick={toggle}
>
  {label}
  {#if active}
    {#if direction === 'asc'}
      <ArrowUp class="ml-1 h-3 w-3" />
    {:else}
      <ArrowDown class="ml-1 h-3 w-3" />
    {/if}
  {:else}
    <ArrowUpDown class="ml-1 h-3 w-3 opacity-40" />
  {/if}
</Button>
