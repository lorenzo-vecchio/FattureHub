<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import UploadZone from './UploadZone.svelte';

  let {
    open = $bindable(false),
    onfiles,
  }: {
    open: boolean;
    onfiles: (files: File[]) => void;
  } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Importa fatture</Dialog.Title>
      <Dialog.Description>
        Carica file .xml, .p7m (XML firmato) o archivi .zip contenenti fatture FatturaPA
      </Dialog.Description>
    </Dialog.Header>
    <div class="py-4">
      <UploadZone {onfiles} />
    </div>
    <Dialog.Footer>
      <Dialog.Close>
        <Button variant="outline">Annulla</Button>
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
