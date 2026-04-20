<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Loader, Save } from 'lucide-svelte';

  let { open = $bindable(false), onsave }: {
    open: boolean;
    onsave: (name: string) => Promise<void>;
  } = $props();

  let name = $state('');
  let saving = $state(false);
  let error = $state('');

  function handleOpenChange(v: boolean) {
    if (!saving) {
      open = v;
      if (!v) { name = ''; error = ''; }
    }
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    saving = true;
    error = '';
    try {
      await onsave(trimmed);
      open = false;
      name = '';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Errore durante il salvataggio.';
    } finally {
      saving = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
  }
</script>

<Dialog.Root open={open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-sm">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Save class="h-4 w-4" />
        Salva progetto
      </Dialog.Title>
      <Dialog.Description>
        Le fatture e i filtri attivi vengono salvati nel database locale dell'app.
      </Dialog.Description>
    </Dialog.Header>
    <div class="space-y-2 py-2">
      <Label for="project-name">Nome progetto</Label>
      <Input
        id="project-name"
        placeholder="es. Fatture Q1 2024"
        bind:value={name}
        onkeydown={handleKeydown}
        disabled={saving}
      />
      {#if error}
        <p class="text-xs text-destructive">{error}</p>
      {/if}
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => handleOpenChange(false)} disabled={saving}>
        Annulla
      </Button>
      <Button onclick={handleSave} disabled={!name.trim() || saving}>
        {#if saving}
          <Loader class="mr-2 h-3.5 w-3.5 animate-spin" />
          Salvataggio…
        {:else}
          <Save class="mr-2 h-3.5 w-3.5" />
          Salva
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
