<script lang="ts">
  import { Upload } from 'lucide-svelte';

  let { onimport }: { onimport: () => void } = $props();
</script>

<div class="flex items-center justify-between">
  <div class="text-left">
    <h2 class="text-2xl font-semibold">I tuoi progetti</h2>
    <p class="mt-1 text-muted-foreground">Scegli un progetto da aprire</p>
  </div>
  <button
    onclick={onimport}
    class="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <Upload class="h-4 w-4" />
    Importa nuove fatture
  </button>
</div>
