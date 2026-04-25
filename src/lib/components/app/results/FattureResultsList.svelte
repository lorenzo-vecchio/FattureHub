<script lang="ts">
  import type { Fattura } from '$lib/parser';
  import FatturaListItem from '../FatturaListItem.svelte';

  let {
    invoices,
    openInvoice,
  }: {
    invoices: Fattura[];
    openInvoice: (fattura: Fattura) => void;
  } = $props();
</script>

{#each invoices as fat}
  <FatturaListItem fat={fat} onopen={() => openInvoice(fat)} />
  <div class="m-3"></div>
{/each}
