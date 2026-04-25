<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Separator } from '$lib/components/ui/separator';
  import type { Fattura } from '$lib/parser';
  import { cedenteLabel } from '$lib/parser';
  import FatturaAmountsSection from './fattura-dialog/FatturaAmountsSection.svelte';
  import FatturaCedenteSection from './fattura-dialog/FatturaCedenteSection.svelte';
  import FatturaCessionarioSection from './fattura-dialog/FatturaCessionarioSection.svelte';
  import FatturaDialogFooter from './fattura-dialog/FatturaDialogFooter.svelte';
  import FatturaDocumentSection from './fattura-dialog/FatturaDocumentSection.svelte';
  import FatturaNotesSection from './fattura-dialog/FatturaNotesSection.svelte';
  import FatturaTransmissionSection from './fattura-dialog/FatturaTransmissionSection.svelte';

  let { fattura, open = $bindable(false), onremove }: {
    fattura: Fattura | null;
    open: boolean;
    onremove?: (fattura: Fattura) => Promise<void>;
  } = $props();

  let removing = $state(false);

  function downloadXml() {
    if (!fattura) return;
    const blob = new Blob([fattura.rawXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fattura.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRemove() {
    if (!fattura || !onremove || !fattura.id || removing) return;

    const confirmed = confirm('Vuoi rimuovere questa fattura dal progetto?');
    if (!confirmed) return;

    removing = true;
    try {
      await onremove(fattura);
      open = false;
    } finally {
      removing = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-2xl">

    {#if fattura}

      <Dialog.Header>
        <Dialog.Title class="flex flex-wrap items-center gap-2 text-base">
          <Badge variant="outline" class="font-mono">{fattura.tipoDocumento || '—'}</Badge>
          <span>{cedenteLabel(fattura)}</span>
        </Dialog.Title>
        <Dialog.Description class="text-xs text-muted-foreground truncate">
          {fattura.fileName}
        </Dialog.Description>
      </Dialog.Header>

      <div class="overflow-y-auto max-h-[60vh] space-y-5 pr-1">
        <FatturaDocumentSection {fattura} />

        <Separator />
        <FatturaAmountsSection {fattura} />

        <Separator />
        <FatturaCedenteSection {fattura} />

        <Separator />
        <FatturaCessionarioSection {fattura} />

        <Separator />
        <FatturaTransmissionSection {fattura} />

        {#if fattura.causale || fattura.descrizioni.length > 0}
          <Separator />
          <FatturaNotesSection {fattura} />
        {/if}

      </div>
      <FatturaDialogFooter
        {fattura}
        {removing}
        {downloadXml}
        removeInvoice={handleRemove}
      />

    {/if}

  </Dialog.Content>
</Dialog.Root>
