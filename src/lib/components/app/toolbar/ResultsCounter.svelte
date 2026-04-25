<script lang="ts">
  let {
    resultsCount,
    fattureCount,
  }: {
    resultsCount: number;
    fattureCount: number;
  } = $props();
</script>

<p class="text-sm text-muted-foreground">
  <span class="font-medium text-foreground">{resultsCount}</span> risultati su {fattureCount}
</p>
