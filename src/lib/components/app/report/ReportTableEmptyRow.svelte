<script lang="ts">
  import { TableCell, TableRow } from '$lib/components/ui/table';

  let {
    colspan,
  }: {
    colspan: number;
  } = $props();
</script>

<TableRow>
  <TableCell colspan={colspan} class="text-center text-xs text-muted-foreground">
    Nessun risultato
  </TableCell>
</TableRow>
