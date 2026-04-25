<script lang="ts">
  let {
    title,
    description,
    checked,
    label,
    toggle,
  }: {
    title: string;
    description: string;
    checked: boolean;
    label: string;
    toggle: () => void;
  } = $props();
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div class="space-y-0.5">
      <p class="text-sm font-medium">{title}</p>
      <p class="text-xs text-muted-foreground">{description}</p>
    </div>
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {checked ? 'bg-primary' : 'bg-input'}"
      onclick={toggle}
    >
      <span
        class="pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {checked ? 'translate-x-4' : 'translate-x-0'}"
      ></span>
    </button>
  </div>
</div>
