<script lang="ts">
  import { parseXml, type Fattura } from '$lib/parser';
  import { applyFilters, emptyFilters, countActiveFilters } from '$lib/filters';
  import JSZip from 'jszip';

  import AppHeader from '$lib/components/app/AppHeader.svelte';
  import UploadZone from '$lib/components/app/UploadZone.svelte';
  import LoadingCard from '$lib/components/app/LoadingCard.svelte';
  import ErrorsCard from '$lib/components/app/ErrorsCard.svelte';
  import FiltersPanel from '$lib/components/app/FiltersPanel.svelte';
  import FattureResults from '$lib/components/app/FattureResults.svelte';

  let fatture = $state<Fattura[]>([]);
  let filters = $state(emptyFilters());
  let loading = $state(false);
  let loadingProgress = $state({ done: 0, total: 0 });
  let errors = $state<string[]>([]);

  let filtrate = $derived(applyFilters(fatture, filters));
  let activeFilters = $derived(countActiveFilters(filters));

  // Filtra file di metadati macOS (Apple Double: ._xxx, cartella __MACOSX)
  function isMacMeta(path: string): boolean {
    const name = path.split('/').pop() ?? path;
    return name.startsWith('._') || path.includes('__MACOSX');
  }

  async function processFiles(files: File[]) {
    loading = true;
    errors = [];
    const xmlFiles: { name: string; text: string }[] = [];

    for (const file of files) {
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        for (const [path, entry] of Object.entries(zip.files)) {
          if (!entry.dir && path.toLowerCase().endsWith('.xml') && !isMacMeta(path)) {
            const text = await entry.async('string');
            xmlFiles.push({ name: path.split('/').pop() ?? path, text });
          }
        }
      } else if (file.name.toLowerCase().endsWith('.xml') && !isMacMeta(file.name)) {
        xmlFiles.push({ name: file.name, text: await file.text() });
      }
    }

    loadingProgress = { done: 0, total: xmlFiles.length };
    const parsed: Fattura[] = [];

    for (const { name, text } of xmlFiles) {
      const f = parseXml(name, text);
      if (f) parsed.push(f);
      else errors.push(name);
      loadingProgress.done++;
    }

    fatture = [...fatture, ...parsed];
    loading = false;
  }

  function clearAll() {
    fatture = [];
    filters = emptyFilters();
    errors = [];
  }

  function resetFilters() {
    filters = emptyFilters();
  }
</script>

<div class="min-h-screen bg-muted/40">
  <AppHeader fattureCount={fatture.length} {activeFilters} onclear={clearAll} />

  <div class="mx-auto max-w-7xl px-6 py-6">

    {#if fatture.length === 0 && !loading}
      <UploadZone onfiles={processFiles} />
    {/if}

    {#if loading}
      <LoadingCard done={loadingProgress.done} total={loadingProgress.total} />
    {/if}

    {#if errors.length > 0}
      <ErrorsCard {errors} />
    {/if}

    {#if fatture.length > 0 && !loading}
      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <FiltersPanel {filters} {fatture} {activeFilters} onreset={resetFilters} />
        <FattureResults
          {filtrate}
          fattureCount={fatture.length}
          onaddfile={processFiles}
          onreset={resetFilters}
        />
      </div>
    {/if}

  </div>
</div>
