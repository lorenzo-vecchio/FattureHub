<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Upload } from 'lucide-svelte';
  import UploadZoneActions from './upload/UploadZoneActions.svelte';

  let { onfiles }: { onfiles: (files: File[]) => void } = $props();

  let dragOver = $state(false);

  // --- File System Entry API: legge ricorsivamente file e cartelle ---

  async function readEntry(entry: FileSystemEntry): Promise<File[]> {
    if (entry.isFile) {
      return new Promise<File[]>((resolve) => {
        (entry as FileSystemFileEntry).file(
          (f) => resolve([f]),
          () => resolve([])
        );
      });
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const subEntries = await drainReader(reader);
      const nested = await Promise.all(subEntries.map(readEntry));
      return nested.flat();
    }
    return [];
  }

  // readEntries restituisce al massimo 100 voci per chiamata — cicliamo finché vuoto
  async function drainReader(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    const all: FileSystemEntry[] = [];
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject)
      );
      if (!batch.length) break;
      all.push(...batch);
    }
    return all;
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (!e.dataTransfer?.items?.length) return;

    const nested = await Promise.all(
      Array.from(e.dataTransfer.items).map((item) => {
        const entry = item.webkitGetAsEntry();
        if (entry) return readEntry(entry);
        const f = item.getAsFile();
        return Promise.resolve(f ? [f] : []);
      })
    );

    const files = nested.flat();
    if (files.length) onfiles(files);
  }
</script>

<Card.Root
  class="border-2 border-dashed transition-colors {dragOver ? 'border-primary bg-primary/5' : 'border-border'}"
  ondragover={(e) => { e.preventDefault(); dragOver = true; }}
  ondragleave={() => (dragOver = false)}
  ondrop={onDrop}
>
  <Card.Content class="flex flex-col items-center gap-5 py-20">
    <div class="rounded-full bg-muted p-4">
      <Upload class="h-8 w-8 text-muted-foreground" />
    </div>
    <div class="text-center">
      <p class="text-lg font-medium">Trascina una cartella o un file ZIP</p>
      <p class="mt-1 text-sm text-muted-foreground">Supporta file .xml, .p7m (XML firmato) e archivi .zip contenenti fatture FatturaPA</p>
    </div>
    <UploadZoneActions selectFiles={onfiles} />
  </Card.Content>
</Card.Root>
