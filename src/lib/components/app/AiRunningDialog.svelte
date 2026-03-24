<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  let {
    open = $bindable(false),
    onconfirm,
    oncancel,
  }: {
    open: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();
</script>

<Dialog.Root {open} onOpenChange={(v) => { if (!v) oncancel(); }}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="sm:max-w-[400px]">
      <Dialog.Header>
        <Dialog.Title>AI in esecuzione</Dialog.Title>
        <Dialog.Description>
          L'AI sta elaborando una richiesta. Sei sicuro di voler chiudere?
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="flex gap-2 justify-end">
        <Button variant="outline" onclick={oncancel}>Annulla</Button>
        <Button variant="destructive" onclick={onconfirm}>Chiudi comunque</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
