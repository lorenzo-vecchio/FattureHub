<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Monitor, Moon, Sun } from 'lucide-svelte';

  type ThemeValue = 'light' | 'dark' | 'system';

  const themes = [
    { value: 'light', label: 'Chiaro', icon: Sun },
    { value: 'dark', label: 'Scuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ] as const;

  let {
    currentTheme,
    selectTheme,
  }: {
    currentTheme: ThemeValue;
    selectTheme: (value: ThemeValue) => void;
  } = $props();
</script>

<div class="space-y-3">
  <p class="text-sm font-medium">Tema</p>
  <div class="flex gap-2">
    {#each themes as t}
      {@const active = currentTheme === t.value}
      <Button
        variant={active ? 'default' : 'outline'}
        class="flex-1 flex-col h-auto py-3 gap-1.5"
        onclick={() => selectTheme(t.value)}
      >
        <t.icon class="h-4 w-4" />
        <span class="text-xs">{t.label}</span>
      </Button>
    {/each}
  </div>
</div>
