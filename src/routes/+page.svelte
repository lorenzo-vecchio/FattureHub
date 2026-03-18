<script lang="ts">
  import { parseXml, cedenteLabel, type Fattura } from '$lib/parser';
  import { applyFilters, emptyFilters, countActiveFilters, TIPI_DOCUMENTO, REGIMI_FISCALI } from '$lib/filters';
  import { downloadZip } from '$lib/zipper';
  import JSZip from 'jszip';

  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import { Separator } from '$lib/components/ui/separator';
  import * as Card from '$lib/components/ui/card';
  import * as Select from '$lib/components/ui/select';

  import { Upload, FolderOpen, Download, X, Funnel, RotateCcw } from 'lucide-svelte';

  // --- State ---
  let fatture = $state<Fattura[]>([]);
  let filters = $state(emptyFilters());
  let loading = $state(false);
  let loadingProgress = $state({ done: 0, total: 0 });
  let dragOver = $state(false);
  let errors = $state<string[]>([]);

  // --- Derived ---
  let filtrate = $derived(applyFilters(fatture, filters));
  let activeFilters = $derived(countActiveFilters(filters));
  let totaleImponibile = $derived(filtrate.reduce((a, f) => a + f.imponibile, 0));
  let totaleImposta = $derived(filtrate.reduce((a, f) => a + f.imposta, 0));
  let totaleDocumento = $derived(filtrate.reduce((a, f) => a + f.importoTotale, 0));

  // --- File loading ---
  async function processFiles(files: FileList | File[]) {
    loading = true;
    errors = [];
    const fileArr = Array.from(files);
    const xmlFiles: { name: string; text: string }[] = [];

    for (const file of fileArr) {
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        for (const [path, entry] of Object.entries(zip.files)) {
          if (!entry.dir && path.toLowerCase().endsWith('.xml')) {
            const text = await entry.async('string');
            xmlFiles.push({ name: path.split('/').pop() ?? path, text });
          }
        }
      } else if (file.name.toLowerCase().endsWith('.xml')) {
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

  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) processFiles(input.files);
    input.value = ''; // reset so same folder can be re-selected
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const files = Array.from(e.dataTransfer?.items ?? [])
      .map(i => i.getAsFile())
      .filter(Boolean) as File[];
    if (files.length) processFiles(files);
  }

  function clearAll() {
    fatture = [];
    filters = emptyFilters();
    errors = [];
  }

  function resetFilters() {
    filters = emptyFilters();
  }

  function toggleTipo(val: string) {
    filters.tipoDocumento = filters.tipoDocumento.includes(val)
      ? filters.tipoDocumento.filter(t => t !== val)
      : [...filters.tipoDocumento, val];
  }

  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
</script>

<div class="min-h-screen bg-muted/40">

  <!-- Header -->
  <header class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="mx-auto max-w-7xl flex h-14 items-center justify-between px-6">
      <div class="flex items-center gap-3">
        <h1 class="text-base font-semibold">Filtro Fatture Elettroniche</h1>
        {#if fatture.length > 0}
          <Badge variant="secondary">{fatture.length} caricate</Badge>
        {/if}
        {#if activeFilters > 0}
          <Badge>{activeFilters} filtri attivi</Badge>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        {#if fatture.length > 0}
          <Button variant="ghost" size="sm" onclick={clearAll}>
            <X class="mr-1.5 h-3.5 w-3.5" />
            Svuota tutto
          </Button>
        {/if}
      </div>
    </div>
  </header>

  <div class="mx-auto max-w-7xl px-6 py-6">

    <!-- Upload zone -->
    {#if fatture.length === 0 && !loading}
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
            <p class="mt-1 text-sm text-muted-foreground">Supporta file .xml e archivi .zip contenenti fatture FatturaPA</p>
          </div>
          <div class="flex gap-3">
            <Button variant="outline">
              <label class="cursor-pointer flex flex-row">
                <FolderOpen class="mr-2 h-4 w-4" />
                Scegli cartella
                <input type="file" class="sr-only" webkitdirectory multiple onchange={onFileInput} />
              </label>
            </Button>
            <Button variant="outline">
              <label class="cursor-pointer flex flex-row">
                <Upload class="mr-2 h-4 w-4" />
                Scegli file XML / ZIP
                <input type="file" class="sr-only" multiple accept=".xml,.zip" onchange={onFileInput} />
              </label>
            </Button>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Loading -->
    {#if loading}
      <Card.Root>
        <Card.Content class="py-8">
          <div class="flex items-center gap-3 mb-3">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span class="text-sm font-medium">Analisi fatture in corso...</span>
            <span class="text-sm text-muted-foreground">{loadingProgress.done} / {loadingProgress.total}</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              class="h-full bg-primary transition-all duration-300"
              style="width: {loadingProgress.total ? (loadingProgress.done / loadingProgress.total) * 100 : 0}%"
            ></div>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Errors -->
    {#if errors.length > 0}
      <Card.Root class="border-destructive/50 bg-destructive/5 mt-4">
        <Card.Content class="py-3">
          <p class="text-sm text-destructive">
            <span class="font-medium">{errors.length} file non analizzati:</span>
            {errors.slice(0, 5).join(', ')}{errors.length > 5 ? ` e altri ${errors.length - 5}...` : ''}
          </p>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Main layout: filtri + risultati -->
    {#if fatture.length > 0 && !loading}
      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">

        <!-- ── Pannello filtri ── -->
        <aside class="space-y-0">
          <Card.Root class="sticky top-20 max-h-[80vh]">
            <Card.Header class="pb-3">
              <div class="flex items-center justify-between">
                <Card.Title class="flex items-center gap-2 text-base">
                  <Funnel class="h-4 w-4" />
                  Filtri
                </Card.Title>
                {#if activeFilters > 0}
                  <Button variant="ghost" size="sm" onclick={resetFilters} class="h-7 px-2 text-xs">
                    <RotateCcw class="mr-1 h-3 w-3" />
                    Azzera
                  </Button>
                {/if}
              </div>
            </Card.Header>

            <Card.Content class="space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto pb-6">

              <!-- Data -->
              <div class="space-y-2">
                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Data documento
                </Label>
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <Label class="text-xs">Da</Label>
                    <Input type="date" bind:value={filters.dataFrom} class="h-8 text-sm" />
                  </div>
                  <div class="space-y-1">
                    <Label class="text-xs">A</Label>
                    <Input type="date" bind:value={filters.dataTo} class="h-8 text-sm" />
                  </div>
                </div>
              </div>

              <Separator />

              <!-- Fornitore -->
              <div class="space-y-2">
                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fornitore (Cedente)
                </Label>
                <div class="space-y-2">
                  <div class="space-y-1">
                    <Label class="text-xs">Nome / denominazione</Label>
                    <Input bind:value={filters.fornitore} placeholder="es. Rossi Srl" class="h-8 text-sm" />
                  </div>
                  <div class="space-y-1">
                    <Label class="text-xs">P.IVA</Label>
                    <Input bind:value={filters.pivaFornitore} placeholder="es. 01234567890" class="h-8 text-sm" />
                  </div>
                </div>
              </div>

              <Separator />

              <!-- Cliente -->
              <div class="space-y-2">
                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cliente (Cessionario)
                </Label>
                <div class="space-y-1">
                  <Label class="text-xs">Nome / denominazione</Label>
                  <Input bind:value={filters.cliente} placeholder="es. Bianchi Spa" class="h-8 text-sm" />
                </div>
              </div>

              <Separator />

              <!-- Importo -->
              <div class="space-y-2">
                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Importo totale (€)
                </Label>
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <Label class="text-xs">Min</Label>
                    <Input type="number" bind:value={filters.importoMin} placeholder="0" class="h-8 text-sm" />
                  </div>
                  <div class="space-y-1">
                    <Label class="text-xs">Max</Label>
                    <Input type="number" bind:value={filters.importoMax} placeholder="∞" class="h-8 text-sm" />
                  </div>
                </div>
              </div>

              <Separator />

              <!-- Numero fattura -->
              <div class="space-y-2">
                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Numero fattura
                </Label>
                <Input bind:value={filters.numero} placeholder="es. 2024/001" class="h-8 text-sm" />
              </div>

              <Separator />

              <!-- Tipo documento -->
              <div class="space-y-2">
                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo documento
                </Label>
                <div class="flex flex-wrap gap-1.5">
                  {#each TIPI_DOCUMENTO as tipo}
                    <button
                      onclick={() => toggleTipo(tipo.value)}
                      title={tipo.label}
                      class="rounded-md border px-2 py-1 text-xs font-medium transition-colors
                             {filters.tipoDocumento.includes(tipo.value)
                               ? 'bg-primary text-primary-foreground border-primary'
                               : 'bg-background text-foreground border-border hover:bg-muted'}"
                    >
                      {tipo.value}
                    </button>
                  {/each}
                </div>
              </div>

              <Separator />

              <!-- Regime fiscale -->
              <div class="space-y-2">
                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Regime fiscale
                </Label>
                <Select.Root bind:value={filters.regimeFiscale}>
                  <Select.Trigger class="h-8 text-sm w-full">
                    {filters.regimeFiscale
                      ? REGIMI_FISCALI.find(r => r.value === filters.regimeFiscale)?.label
                      : 'Tutti i regimi'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">Tutti i regimi</Select.Item>
                    {#each REGIMI_FISCALI as r}
                      <Select.Item value={r.value}>{r.label}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>

              <Separator />

              <!-- Formato trasmissione -->
              <div class="space-y-2">
                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Formato trasmissione
                </Label>
                <div class="flex gap-2">
                  {#each [{ v: '', l: 'Tutti' }, { v: 'FPR12', l: 'FPR12' }, { v: 'FPA12', l: 'FPA12' }] as opt}
                    <Button
                      variant={filters.formatoTrasmissione === opt.v ? 'default' : 'outline'}
                      size="sm"
                      class="flex-1 h-8 text-xs"
                      onclick={() => (filters.formatoTrasmissione = opt.v)}
                    >
                      {opt.l}
                    </Button>
                  {/each}
                </div>
              </div>

              <Separator />

              <!-- Testo libero -->
              <div class="space-y-2">
                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Testo libero
                </Label>
                <Input
                  bind:value={filters.testoLibero}
                  placeholder="Cerca in descrizioni e causale"
                  class="h-8 text-sm"
                />
              </div>

            </Card.Content>
          </Card.Root>
        </aside>

        <!-- ── Risultati ── -->
        <section class="space-y-3">

          <!-- Toolbar risultati -->
          <div class="flex items-center justify-between">
            <p class="text-sm text-muted-foreground">
              <span class="font-medium text-foreground">{filtrate.length}</span> risultati su {fatture.length}
            </p>
            <div class="flex gap-2">
              <Button variant="outline" size="sm">
                <label class="cursor-pointer flex flex-row">
                  <Upload class="mr-2 h-3.5 w-3.5" />
                  Aggiungi file
                  <input type="file" class="sr-only" multiple accept=".xml,.zip" onchange={onFileInput} />
                </label>
              </Button>
              <Button
                size="sm"
                disabled={filtrate.length === 0}
                onclick={() => downloadZip(filtrate)}
              >
                <Download class="mr-2 h-3.5 w-3.5" />
                Scarica ZIP ({filtrate.length})
              </Button>
            </div>
          </div>

          <!-- Lista fatture -->
          {#if filtrate.length === 0}
            <Card.Root>
              <Card.Content class="flex flex-col items-center gap-3 py-16 text-center">
                <Funnel class="h-8 w-8 text-muted-foreground/50" />
                <p class="text-sm text-muted-foreground">Nessuna fattura corrisponde ai filtri selezionati.</p>
                <Button variant="outline" size="sm" onclick={resetFilters}>
                  <RotateCcw class="mr-2 h-3.5 w-3.5" />
                  Azzera filtri
                </Button>
              </Card.Content>
            </Card.Root>
          {:else}
            {#each filtrate as fat}
              <Card.Root class="transition-colors hover:border-foreground/30">
                <Card.Content class="flex items-start justify-between gap-4 py-4">
                  <div class="min-w-0 flex-1 space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" class="font-mono text-xs">
                        {fat.tipoDocumento || '—'}
                      </Badge>
                      <span class="text-sm font-medium">{cedenteLabel(fat)}</span>
                    </div>
                    <div class="flex flex-wrap gap-x-3 gap-y-0.5">
                      {#if fat.data}
                        <span class="text-xs text-muted-foreground">{fat.data}</span>
                      {/if}
                      {#if fat.numero}
                        <span class="text-xs text-muted-foreground">#{fat.numero}</span>
                      {/if}
                      {#if fat.cedentePiva}
                        <span class="text-xs text-muted-foreground">P.IVA {fat.cedentePiva}</span>
                      {/if}
                      {#if fat.cedenteRegimeFiscale}
                        <Badge variant="secondary" class="text-xs h-4">{fat.cedenteRegimeFiscale}</Badge>
                      {/if}
                    </div>
                    <p class="truncate text-xs text-muted-foreground/70">{fat.fileName}</p>
                  </div>
                  <div class="shrink-0 text-right">
                    <p class="text-sm font-semibold">{fmt.format(fat.importoTotale)}</p>
                    {#if fat.imposta > 0}
                      <p class="text-xs text-muted-foreground">IVA {fmt.format(fat.imposta)}</p>
                    {/if}
                  </div>
                </Card.Content>
              </Card.Root>
              <div class="m-10"></div>
            {/each}

            <!-- Totali -->
            <Card.Root class="bg-primary text-primary-foreground sticky bottom-10">
              <Card.Content class="flex flex-wrap items-center justify-between gap-4 py-4">
                <p class="text-sm font-medium">{filtrate.length} fatture selezionate</p>
                <div class="flex flex-wrap gap-6">
                  <div class="text-right">
                    <p class="text-xs opacity-70">Imponibile</p>
                    <p class="text-sm font-semibold">{fmt.format(totaleImponibile)}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs opacity-70">IVA</p>
                    <p class="text-sm font-semibold">{fmt.format(totaleImposta)}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs opacity-70">Totale</p>
                    <p class="text-sm font-semibold">{fmt.format(totaleDocumento)}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => downloadZip(filtrate)}
                  >
                    <Download class="mr-2 h-3.5 w-3.5" />
                    Scarica ZIP
                  </Button>
                </div>
              </Card.Content>
            </Card.Root>
          {/if}
        </section>
      </div>
    {/if}
  </div>
</div>