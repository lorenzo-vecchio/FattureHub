<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  let {
    from,
    to,
    updateFrom,
    updateTo,
  }: {
    from: string;
    to: string;
    updateFrom: (value: string) => void;
    updateTo: (value: string) => void;
  } = $props();
</script>

<div class="space-y-2">
  <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Data documento
  </Label>
  <div class="grid grid-cols-2 gap-2">
    <div class="space-y-1">
      <Label class="text-xs">Da</Label>
      <Input type="date" value={from} onchange={(e) => updateFrom((e.target as HTMLInputElement).value)} class="h-8 text-sm" />
    </div>
    <div class="space-y-1">
      <Label class="text-xs">A</Label>
      <Input type="date" value={to} onchange={(e) => updateTo((e.target as HTMLInputElement).value)} class="h-8 text-sm" />
    </div>
  </div>
</div>
