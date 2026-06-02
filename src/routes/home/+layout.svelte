<script lang="ts">
  import { page } from '$app/stores';
  import { app } from '$lib/stores/app.svelte';

  let { children } = $props();

  let isHomeRoute = $derived(
    $page.url.pathname === '/home/projects' || $page.url.pathname === '/home/report'
  );
</script>

{#if app.errors.length > 0}
  <!-- errors are handled by root layout -->
{/if}

{#if isHomeRoute}
  <div class="mb-6 inline-flex items-center rounded-lg bg-muted p-1">
    <a
      href="/home/projects"
      class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {$page.url.pathname === '/home/projects' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
    >
      Progetti
    </a>
    <a
      href="/home/report"
      class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {$page.url.pathname === '/home/report' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
    >
      Report
    </a>
  </div>
{/if}

{@render children()}
