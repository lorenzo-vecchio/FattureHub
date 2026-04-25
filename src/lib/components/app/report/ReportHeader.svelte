<script lang="ts">
  let {
    createdAt,
    prompt,
  }: {
    createdAt: string | number;
    prompt: string;
  } = $props();

  const dateStr = $derived(new Date(createdAt).toLocaleString('it-IT'));
</script>

<div class="space-y-1">
  <p class="text-xs text-muted-foreground">{dateStr}</p>
  <p class="text-sm italic text-muted-foreground line-clamp-2">"{prompt}"</p>
</div>
