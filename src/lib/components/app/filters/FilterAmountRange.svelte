<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  let {
    min,
    max,
    updateMin,
    updateMax,
  }: {
    min: string | number | null;
    max: string | number | null;
    updateMin: (value: string | number | null) => void;
    updateMax: (value: string | number | null) => void;
  } = $props();

  const minValue = $derived(min ?? '');
  const maxValue = $derived(max ?? '');
</script>

<div class="space-y-2">
  <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Importo totale (€)
  </Label>
  <div class="grid grid-cols-2 gap-2">
    <div class="space-y-1">
      <Label class="text-xs">Min</Label>
      <Input
        type="number"
        value={minValue}
        placeholder="0"
        class="h-8 text-sm"
        onchange={(e) => updateMin((e.target as HTMLInputElement).value)}
      />
    </div>
    <div class="space-y-1">
      <Label class="text-xs">Max</Label>
      <Input
        type="number"
        value={maxValue}
        placeholder="∞"
        class="h-8 text-sm"
        onchange={(e) => updateMax((e.target as HTMLInputElement).value)}
      />
    </div>
  </div>
</div>
