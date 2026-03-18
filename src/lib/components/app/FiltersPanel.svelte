<script lang="ts">
  import type { Filters } from '$lib/filters';
  import { TIPI_DOCUMENTO, REGIMI_FISCALI } from '$lib/filters';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Separator } from '$lib/components/ui/separator';
  import * as Card from '$lib/components/ui/card';
  import * as Select from '$lib/components/ui/select';
  import { Funnel, RotateCcw } from 'lucide-svelte';

  let { filters, activeFilters, onreset }: {
    filters: Filters;
    activeFilters: number;
    onreset: () => void;
  } = $props();

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
