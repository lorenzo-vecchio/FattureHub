<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Download, Save, Upload } from 'lucide-svelte';

  let {
    resultsCount,
    fattureCount,
    isDirty,
    currentProjectName,
    onaddfile,
    onsave,
    onopenexport,
  }: {
    resultsCount: number;
    fattureCount: number;
    isDirty: boolean;
    currentProjectName: string | null;
    onaddfile: (files: File[]) => void;
    onsave: () => void;
    onopenexport: () => void;
  } = $props();

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) onaddfile(Array.from(input.files));
    input.value = '';
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-2 mb-5">
  <p class="text-sm text-muted-foreground">
    <span class="font-medium text-foreground">{resultsCount}</span> risultati su {fattureCount}
  </p>

  <div class="flex flex-wrap items-center gap-2">

    <!-- Aggiungi file -->
    <Button variant="outline" size="sm">
      <label class="cursor-pointer flex flex-row">
        <Upload class="mr-2 h-3.5 w-3.5" />
        Aggiungi file
        <input type="file" class="sr-only" multiple accept=".xml,.zip" onchange={handleFileInput} />
      </label>
    </Button>

    <!-- Salva progetto -->
    <Button variant={isDirty && currentProjectName ? 'default' : 'outline'} size="sm" onclick={onsave}>
      {#if isDirty && currentProjectName}
        <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"></span>
      {:else}
        <Save class="mr-2 h-3.5 w-3.5" />
      {/if}
      {currentProjectName ? 'Salva' : 'Salva progetto'}
    </Button>

    <!-- Esporta ZIP -->
    <Button size="sm" disabled={resultsCount === 0} onclick={onopenexport}>
      <Download class="mr-2 h-3.5 w-3.5" />
      Esporta ZIP ({resultsCount})
    </Button>

  </div>
</div>
