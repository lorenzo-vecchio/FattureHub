<script lang="ts">
  type DocType = {
    value: string;
    label: string;
  };

  let {
    selected,
    options,
    toggle,
  }: {
    selected: string[];
    options: DocType[];
    toggle: (value: string) => void;
  } = $props();
</script>

<div class="space-y-2">
  <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo documento</p>
  <div class="flex flex-wrap gap-1.5">
    {#each options as tipo}
      <button
        onclick={() => toggle(tipo.value)}
        title={tipo.label}
        class="rounded-md border px-2 py-1 text-xs font-medium transition-colors
               {selected.includes(tipo.value)
                 ? 'bg-primary text-primary-foreground border-primary'
                 : 'bg-background text-foreground border-border hover:bg-muted'}"
      >
        {tipo.value}
      </button>
    {/each}
  </div>
</div>
