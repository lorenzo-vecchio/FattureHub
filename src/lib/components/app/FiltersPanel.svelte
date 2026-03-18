<script lang="ts">
  import type { Fattura } from '$lib/parser';
  import { cedenteKey, cedenteLabel, cessionarioKey, cessionarioLabel } from '$lib/parser';
  import type { Filters } from '$lib/filters';
  import { TIPI_DOCUMENTO, REGIMI_FISCALI } from '$lib/filters';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Separator } from '$lib/components/ui/separator';
  import * as Card from '$lib/components/ui/card';
  import * as Select from '$lib/components/ui/select';
  import { Funnel, RotateCcw } from 'lucide-svelte';

  interface Props {
    filters: Filters;
    fatture: Fattura[];
    activeFilters: number;
    onreset: () => void;
  }

  let { filters, fatture, activeFilters, onreset }: Props = $props();

  // Unique cedenti and cessionari derived from loaded invoices
  let uniqueCedenti = $derived.by(() => {
    const map = new Map<string, { key: string; label: string; piva: string }>();
    for (const f of fatture) {
      const key = cedenteKey(f);
      if (!map.has(key)) map.set(key, { key, label: cedenteLabel(f), piva: f.cedentePiva });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  });

  let uniqueCessionari = $derived.by(() => {
    const map = new Map<string, { key: string; label: string; piva: string }>();
    for (const f of fatture) {
      const key = cessionarioKey(f);
      if (!map.has(key)) map.set(key, { key, label: cessionarioLabel(f), piva: f.cessionarioPiva });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  });

  function toggleFornitore(key: string) {
    filters.fornitori = filters.fornitori.includes(key)
      ? filters.fornitori.filter(k => k !== key)
      : [...filters.fornitori, key];
  }

  function toggleCliente(key: string) {
    filters.clienti = filters.clienti.includes(key)
      ? filters.clienti.filter(k => k !== key)
      : [...filters.clienti, key];
  }

  function toggleTipo(val: string) {
    filters.tipoDocumento = filters.tipoDocumento.includes(val)
      ? filters.tipoDocumento.filter(t => t !== val)
      : [...filters.tipoDocumento, val];
  }
</script>

<aside>
  <Card.Root class="sticky top-20 max-h-[80vh]">
    <Card.Header class="pb-3">
      <div class="flex items-center justify-between">
        <Card.Title class="flex items-center gap-2 text-base">
          <Funnel class="h-4 w-4" />
          Filtri
        </Card.Title>
        {#if activeFilters > 0}
          <Button variant="ghost" size="sm" onclick={onreset} class="h-7 px-2 text-xs">
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

      <!-- Fornitore (cedente) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fornitore (Cedente)
          </Label>
          {#if filters.fornitori.length > 0}
            <button
              onclick={() => (filters.fornitori = [])}
              class="text-xs text-muted-foreground hover:text-foreground"
            >
              Deseleziona tutti
            </button>
          {/if}
        </div>
        {#if uniqueCedenti.length === 0}
          <p class="text-xs text-muted-foreground italic">Nessun fornitore caricato</p>
        {:else}
          <div class="max-h-40 overflow-y-auto rounded-md border p-2 space-y-0.5">
            {#each uniqueCedenti as c}
              <label class="flex items-start gap-2 cursor-pointer rounded px-1 py-1 hover:bg-muted transition-colors">
                <input
                  type="checkbox"
                  checked={filters.fornitori.includes(c.key)}
                  onchange={() => toggleFornitore(c.key)}
                  class="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
                />
                <div class="min-w-0">
                  <p class="text-xs leading-tight truncate">{c.label}</p>
                  {#if c.piva}
                    <p class="text-xs text-muted-foreground">{c.piva}</p>
                  {/if}
                </div>
              </label>
            {/each}
          </div>
        {/if}
      </div>

      <Separator />

      <!-- Cliente (cessionario) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cliente (Cessionario)
          </Label>
          {#if filters.clienti.length > 0}
            <button
              onclick={() => (filters.clienti = [])}
              class="text-xs text-muted-foreground hover:text-foreground"
            >
              Deseleziona tutti
            </button>
          {/if}
        </div>
        {#if uniqueCessionari.length === 0}
          <p class="text-xs text-muted-foreground italic">Nessun cliente caricato</p>
        {:else}
          <div class="max-h-40 overflow-y-auto rounded-md border p-2 space-y-0.5">
            {#each uniqueCessionari as c}
              <label class="flex items-start gap-2 cursor-pointer rounded px-1 py-1 hover:bg-muted transition-colors">
                <input
                  type="checkbox"
                  checked={filters.clienti.includes(c.key)}
                  onchange={() => toggleCliente(c.key)}
                  class="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
                />
                <div class="min-w-0">
                  <p class="text-xs leading-tight truncate">{c.label}</p>
                  {#if c.piva}
                    <p class="text-xs text-muted-foreground">{c.piva}</p>
                  {/if}
                </div>
              </label>
            {/each}
          </div>
        {/if}
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
        <Select.Root type="single" bind:value={filters.regimeFiscale}>
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
