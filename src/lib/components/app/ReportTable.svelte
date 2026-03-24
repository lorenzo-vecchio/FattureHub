<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
  } from '$lib/components/ui/table';
  import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-svelte';
  import type { TableBlock } from '$lib/ai-reports';

  let { block }: { block: TableBlock } = $props();

  let search = $state('');
  let sortKey = $state<string | null>(null);
  let sortDir = $state<'asc' | 'desc'>('asc');

  let filtered = $derived(() => {
    let rows = block.rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q)),
      );
    }
    if (sortKey) {
      const key = sortKey;
      const dir = sortDir;
      rows = [...rows].sort((a, b) => {
        const av = String(a[key] ?? '');
        const bv = String(b[key] ?? '');
        const numA = parseFloat(av.replace(',', '.'));
        const numB = parseFloat(bv.replace(',', '.'));
        const cmp = !isNaN(numA) && !isNaN(numB) ? numA - numB : av.localeCompare(bv, 'it');
        return dir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  });

  function toggleSort(key: string) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
  }
</script>

<div class="space-y-2">
  {#if block.title}
    <p class="text-sm font-semibold">{block.title}</p>
  {/if}

  {#if block.rows.length > 5}
    <Input
      type="search"
      placeholder="Cerca..."
      bind:value={search}
      class="h-7 text-xs"
    />
  {/if}

  <div class="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          {#each block.columns as col}
            <TableHead class="text-xs">
              <Button
                variant="ghost"
                size="sm"
                class="h-auto px-1 py-0 text-xs font-medium"
                onclick={() => toggleSort(col.key)}
              >
                {col.label}
                {#if sortKey === col.key}
                  {#if sortDir === 'asc'}
                    <ArrowUp class="ml-1 h-3 w-3" />
                  {:else}
                    <ArrowDown class="ml-1 h-3 w-3" />
                  {/if}
                {:else}
                  <ArrowUpDown class="ml-1 h-3 w-3 opacity-40" />
                {/if}
              </Button>
            </TableHead>
          {/each}
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each filtered() as row}
          <TableRow>
            {#each block.columns as col}
              <TableCell class="text-xs">{row[col.key] ?? ''}</TableCell>
            {/each}
          </TableRow>
        {:else}
          <TableRow>
            <TableCell colspan={block.columns.length} class="text-center text-xs text-muted-foreground">
              Nessun risultato
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>

  {#if search && filtered().length !== block.rows.length}
    <p class="text-xs text-muted-foreground">{filtered().length} di {block.rows.length} righe</p>
  {/if}
</div>
