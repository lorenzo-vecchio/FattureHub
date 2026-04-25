<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import { Separator } from '$lib/components/ui/separator';
  import type { Filters } from '$lib/filters';
  import { REGIMI_FISCALI, TIPI_DOCUMENTO } from '$lib/filters';
  import type { Fattura } from '$lib/parser';
  import { cedenteKey, cedenteLabel, cessionarioKey, cessionarioLabel } from '$lib/parser';
  import { Funnel, RotateCcw } from 'lucide-svelte';
  import FilterAmountRange from './filters/FilterAmountRange.svelte';
  import FilterDateRange from './filters/FilterDateRange.svelte';
  import FilterDocumentTypes from './filters/FilterDocumentTypes.svelte';
  import FilterEntityChecklist from './filters/FilterEntityChecklist.svelte';

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

      <FilterDateRange
        from={filters.dataFrom}
        to={filters.dataTo}
        updateFrom={(value) => (filters.dataFrom = value)}
        updateTo={(value) => (filters.dataTo = value)}
      />

      <Separator />

      <FilterEntityChecklist
        title="Fornitore (Cedente)"
        emptyLabel="Nessun fornitore caricato"
        selected={filters.fornitori}
        entities={uniqueCedenti}
        toggle={toggleFornitore}
        clearAll={() => (filters.fornitori = [])}
      />

      <Separator />

      <FilterEntityChecklist
        title="Cliente (Cessionario)"
        emptyLabel="Nessun cliente caricato"
        selected={filters.clienti}
        entities={uniqueCessionari}
        toggle={toggleCliente}
        clearAll={() => (filters.clienti = [])}
      />

      <Separator />

      <FilterAmountRange
        min={filters.importoMin}
        max={filters.importoMax}
        updateMin={(value) => (filters.importoMin = String(value ?? ''))}
        updateMax={(value) => (filters.importoMax = String(value ?? ''))}
      />

      <Separator />

      <!-- Numero fattura -->
      <div class="space-y-2">
        <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Numero fattura
        </Label>
        <Input bind:value={filters.numero} placeholder="es. 2024/001" class="h-8 text-sm" />
      </div>

      <Separator />

      <FilterDocumentTypes
        selected={filters.tipoDocumento}
        options={TIPI_DOCUMENTO}
        toggle={toggleTipo}
      />

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
