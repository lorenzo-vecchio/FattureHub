<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Download, Save, Upload } from 'lucide-svelte';

  let {
    isDirty,
    currentProjectName,
    resultsCount,
    addFiles,
    saveProject,
    openExport,
  }: {
    isDirty: boolean;
    currentProjectName: string | null;
    resultsCount: number;
    addFiles: (files: File[]) => void;
    saveProject: () => void;
    openExport: () => void;
  } = $props();

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) addFiles(Array.from(input.files));
    input.value = '';
  }
</script>

<div class="flex flex-wrap items-center gap-2">
  <Button variant="outline" size="sm">
    <label class="cursor-pointer flex flex-row">
      <Upload class="mr-2 h-3.5 w-3.5" />
      Aggiungi file
      <input type="file" class="sr-only" multiple accept=".xml,.zip" onchange={handleFileInput} />
    </label>
  </Button>

  <Button variant={isDirty && currentProjectName ? 'default' : 'outline'} size="sm" onclick={saveProject}>
    {#if isDirty && currentProjectName}
      <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"></span>
    {:else}
      <Save class="mr-2 h-3.5 w-3.5" />
    {/if}
    {currentProjectName ? 'Salva' : 'Salva progetto'}
  </Button>

  <Button size="sm" disabled={resultsCount === 0} onclick={openExport}>
    <Download class="mr-2 h-3.5 w-3.5" />
    Esporta ZIP ({resultsCount})
  </Button>
</div>
