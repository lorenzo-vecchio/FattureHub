<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import type { Fattura } from '$lib/parser';
  import { Download, Trash2 } from 'lucide-svelte';

  let {
    fattura,
    removing,
    downloadXml,
    removeInvoice,
  }: {
    fattura: Fattura;
    removing: boolean;
    downloadXml: () => void;
    removeInvoice: () => void;
  } = $props();
</script>

<Dialog.Footer class="gap-2">
  <Button variant="outline" size="sm" onclick={downloadXml}>
    <Download class="mr-2 h-3.5 w-3.5" />
    Scarica XML
  </Button>
  <Button
    variant="destructive"
    size="sm"
    disabled={!fattura.id || removing}
    onclick={removeInvoice}
  >
    <Trash2 class="mr-2 h-3.5 w-3.5" />
    {removing ? 'Rimozione...' : 'Rimuovi fattura'}
  </Button>
  <Dialog.Close>
    <Button size="sm">Chiudi</Button>
  </Dialog.Close>
</Dialog.Footer>
