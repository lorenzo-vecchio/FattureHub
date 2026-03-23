<script lang="ts">
  import { setMode, resetMode, userPrefersMode } from 'mode-watcher';
  import * as Sheet from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { Settings, Sun, Moon, Monitor } from 'lucide-svelte';

  let { open = $bindable(false) }: { open: boolean } = $props();

  function handleOpenChange(v: boolean) {
    open = v;
  }

  const themes = [
    { value: 'light', label: 'Chiaro', icon: Sun },
    { value: 'dark', label: 'Scuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ] as const;

  function selectTheme(value: 'light' | 'dark' | 'system') {
    if (value === 'system') resetMode();
    else setMode(value);
  }
</script>

<Sheet.Root open={open} onOpenChange={handleOpenChange}>
  <Sheet.Content side="right" class="flex w-[320px] flex-col gap-0 p-0 sm:max-w-[320px]">
    <Sheet.Header class="border-b px-6 py-4">
      <Sheet.Title class="flex items-center gap-2">
        <Settings class="h-4 w-4" />
        Impostazioni
      </Sheet.Title>
    </Sheet.Header>

    <div class="px-6 py-5 space-y-6">
      <div class="space-y-3">
        <p class="text-sm font-medium">Tema</p>
        <div class="flex gap-2">
          {#each themes as theme}
            {@const active = userPrefersMode.current === theme.value}
            <Button
              variant={active ? 'default' : 'outline'}
              class="flex-1 flex-col h-auto py-3 gap-1.5"
              onclick={() => selectTheme(theme.value)}
            >
              <theme.icon class="h-4 w-4" />
              <span class="text-xs">{theme.label}</span>
            </Button>
          {/each}
        </div>
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
