<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Save, TriangleAlert, Loader } from 'lucide-svelte';

  let { open, hasCurrentProject, saveLabel = 'Salva e chiudi', discardLabel = 'Continua comunque', onsave, onexecute, oncancel }: {
    open: boolean;
    hasCurrentProject: boolean;
    saveLabel?: string;
    discardLabel?: string;
    onsave: (name?: string) => Promise<void>;
    onexecute: () => void;
    oncancel: () => void;
  } = $props();

  let name = $state('');
  let saving = $state(false);
  let error = $state('');

  function handleOpenChange(v: boolean) {
    if (!v && !saving) oncancel();
  }

  async function handleSave() {
    if (!hasCurrentProject && !name.trim()) return;
    saving = true;
    error = '';
    try {
      await onsave(hasCurrentProject ? undefined : name.trim());
    } catch (e) {
      error = e instanceof Error ? e.message : 'Errore durante il salvataggio.';
      saving = false;
      return;
    }
    saving = false;
    name = '';
  }
</script>

<Dialog.Root open={open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-sm">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <TriangleAlert class="h-4 w-4 text-amber-500" />
        Modifiche non salvate
      </Dialog.Title>
      <Dialog.Description>
        Ci sono modifiche non salvate. Vuoi salvarle prima di continuare?
      </Dialog.Description>
    </Dialog.Header>

    {#if !hasCurrentProject}
      <div class="space-y-2 py-1">
        <Label for="unsaved-name">Nome progetto</Label>
        <Input
          id="unsaved-name"
          placeholder="es. Fatture Q1 2024"
          bind:value={name}
          disabled={saving}
        />
        {#if error}
          <p class="text-xs text-destructive">{error}</p>
        {/if}
      </div>
    {/if}

    <Dialog.Footer class="flex-col gap-2 sm:flex-col">
      <Button
        onclick={handleSave}
        disabled={saving || (!hasCurrentProject && !name.trim())}
      >
        {#if saving}
          <Loader class="mr-2 h-3.5 w-3.5 animate-spin" />
          Salvataggio…
        {:else}
          <Save class="mr-2 h-3.5 w-3.5" />
          {saveLabel}
        {/if}
      </Button>
      <Button variant="outline" onclick={onexecute} disabled={saving}>
        {discardLabel}
      </Button>
      <Button variant="ghost" onclick={oncancel} disabled={saving}>
        Annulla
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
