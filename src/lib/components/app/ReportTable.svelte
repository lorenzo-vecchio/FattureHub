<script lang="ts">
  import type { TableBlock } from '$lib/ai-reports';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table';
  import ReportTableEmptyRow from './report/ReportTableEmptyRow.svelte';
  import ReportTableSearch from './report/ReportTableSearch.svelte';
  import ReportTableSortButton from './report/ReportTableSortButton.svelte';

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
    <ReportTableSearch bind:value={search} />
  {/if}

  <div class="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          {#each block.columns as col}
            <TableHead class="text-xs">
              <ReportTableSortButton
                label={col.label}
                active={sortKey === col.key}
                direction={sortDir}
                toggle={() => toggleSort(col.key)}
              />
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
          <ReportTableEmptyRow colspan={block.columns.length} />
        {/each}
      </TableBody>
    </Table>
  </div>

  {#if search && filtered().length !== block.rows.length}
    <p class="text-xs text-muted-foreground">{filtered().length} di {block.rows.length} righe</p>
  {/if}
</div>
