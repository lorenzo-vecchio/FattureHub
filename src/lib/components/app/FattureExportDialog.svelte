<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Download, FolderOpen } from 'lucide-svelte';

  type GroupBy = '' | 'cedente' | 'cessionario';

  let {
    open = $bindable(false),
    groupBy = $bindable<GroupBy>(''),
    groupByLabels,
    onexport,
  }: {
    open: boolean;
    groupBy: GroupBy;
    groupByLabels: Record<GroupBy, string>;
    onexport: () => void;
  } = $props();
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Content class="sm:max-w-115">
    <Dialog.Header>
      <Dialog.Title>Esporta ZIP</Dialog.Title>
      <Dialog.Description>
        Scegli come organizzare i file da esportare.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-3 py-2">
      <p class="text-xs text-muted-foreground">Modalità export:</p>
      <p class="text-xs text-muted-foreground/90 mb-3">
        <span class="font-medium text-foreground">Flat</span> esporta tutti i file nella stessa cartella ZIP;<br>
        <span class="font-medium text-foreground"> Per fornitore</span> crea una cartella per ogni cedente;<br>
        <span class="font-medium text-foreground"> Per cliente</span> crea una cartella per ogni cessionario.
      </p>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {#each Object.entries(groupByLabels) as [v, l]}
          <Button
            variant={groupBy === v ? 'default' : 'outline'}
            size="sm"
            class="justify-start"
            onclick={() => (groupBy = v as GroupBy)}
          >
            {#if v === ''}
              <Download class="mr-2 h-3.5 w-3.5" />
            {:else}
              <FolderOpen class="mr-2 h-3.5 w-3.5" />
            {/if}
            {l}
          </Button>
        {/each}
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Annulla</Button>
      <Button onclick={onexport}>
        <Download class="mr-2 h-3.5 w-3.5" />
        {groupBy === '' ? 'Esporta ZIP' : groupByLabels[groupBy]}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
