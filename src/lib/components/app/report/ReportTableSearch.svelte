<script lang="ts">
  import { Input } from '$lib/components/ui/input';

  let {
    value = $bindable(''),
  }: {
    value: string;
  } = $props();
</script>

<Input
  type="search"
  placeholder="Cerca..."
  bind:value
  class="h-7 text-xs"
/>
