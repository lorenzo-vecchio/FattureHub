<script lang="ts">
  import { Label } from '$lib/components/ui/label';

  type EntityItem = {
    key: string;
    label: string;
    piva: string;
  };

  let {
    title,
    emptyLabel,
    selected,
    entities,
    toggle,
    clearAll,
  }: {
    title: string;
    emptyLabel: string;
    selected: string[];
    entities: EntityItem[];
    toggle: (key: string) => void;
    clearAll: () => void;
  } = $props();
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between">
    <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </Label>
    {#if selected.length > 0}
      <button
        onclick={clearAll}
        class="text-xs text-muted-foreground hover:text-foreground"
      >
        Deseleziona tutti
      </button>
    {/if}
  </div>
  {#if entities.length === 0}
    <p class="text-xs text-muted-foreground italic">{emptyLabel}</p>
  {:else}
    <div class="max-h-40 overflow-y-auto rounded-md border p-2 space-y-0.5">
      {#each entities as entity}
        <label class="flex items-start gap-2 cursor-pointer rounded px-1 py-1 hover:bg-muted transition-colors">
          <input
            type="checkbox"
            checked={selected.includes(entity.key)}
            onchange={() => toggle(entity.key)}
            class="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
          />
          <div class="min-w-0">
            <p class="text-xs leading-tight truncate">{entity.label}</p>
            {#if entity.piva}
              <p class="text-xs text-muted-foreground">{entity.piva}</p>
            {/if}
          </div>
        </label>
      {/each}
    </div>
  {/if}
</div>
