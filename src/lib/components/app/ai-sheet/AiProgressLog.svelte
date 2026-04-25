<script lang="ts">
  import { ChevronRight, Loader } from 'lucide-svelte';

  let {
    steps,
    running,
    refining,
  }: {
    steps: string[];
    running: boolean;
    refining: boolean;
  } = $props();

  let progressContainer = $state<HTMLDivElement | undefined>(undefined);

  $effect(() => {
    const container = progressContainer as HTMLDivElement | undefined;
    const shouldScroll = container && (steps.length > 0 || running || refining);

    if (shouldScroll) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  });
</script>

{#if steps.length > 0 || running || refining}
  <div class="space-y-1">
    <p class="text-xs font-medium text-muted-foreground">Avanzamento</p>
    <div bind:this={progressContainer} class="rounded-md border bg-muted/30 px-3 py-2 space-y-1 max-h-36 overflow-y-auto">
      {#each steps as step}
        <p class="text-xs text-muted-foreground flex items-center gap-1.5">
          <ChevronRight class="h-3 w-3 shrink-0" />
          {step}
        </p>
      {/each}
      {#if running || refining}
        <p class="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader class="h-3 w-3 animate-spin shrink-0" />
          In elaborazione...
        </p>
      {/if}
    </div>
  </div>
{/if}
