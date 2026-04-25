<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { FolderOpen, Upload } from 'lucide-svelte';

  let {
    selectFiles,
  }: {
    selectFiles: (files: File[]) => void;
  } = $props();

  function handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) selectFiles(Array.from(input.files));
    input.value = '';
  }
</script>

<div class="flex gap-3">
  <Button variant="outline">
    <label class="cursor-pointer flex flex-row">
      <FolderOpen class="mr-2 h-4 w-4" />
      Scegli cartella
      <input type="file" class="sr-only" webkitdirectory multiple onchange={handleInput} />
    </label>
  </Button>
  <Button variant="outline">
    <label class="cursor-pointer flex flex-row">
      <Upload class="mr-2 h-4 w-4" />
      Scegli file
      <input type="file" class="sr-only" multiple accept=".xml,.p7m,.zip" onchange={handleInput} />
    </label>
  </Button>
</div>
