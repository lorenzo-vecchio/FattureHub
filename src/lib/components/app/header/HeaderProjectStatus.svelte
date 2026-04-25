<script lang="ts">
  let {
    isDirty,
    isAiRunning,
    currentProjectName,
  }: {
    isDirty: boolean;
    isAiRunning: boolean;
    currentProjectName: string | null;
  } = $props();
</script>

<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
  {#if isDirty || isAiRunning}
    <span class="h-1.5 w-1.5 rounded-full {isAiRunning ? 'bg-blue-400 animate-pulse' : 'bg-amber-400'} shrink-0"></span>
  {/if}
  <span class="max-w-[200px] truncate">
    {currentProjectName ?? 'Non salvato'}
  </span>
</div>
