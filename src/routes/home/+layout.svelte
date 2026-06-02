<script lang="ts">
  import { page } from '$app/stores';
  import LoadingCard from '$lib/components/app/LoadingCard.svelte';
  import { app } from '$lib/stores/app.svelte';

  let { children } = $props();

  let isHomeRoute = $derived(
    $page.url.pathname === '/home/projects' || $page.url.pathname === '/home/report'
  );
</script>

{#if app.openingProject}
  <div class="flex items-center justify-center py-16">
    <div class="text-center">
      <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      <p class="text-sm text-muted-foreground">Caricamento progetto in corso...</p>
    </div>
  </div>
{:else if app.loading}
  <LoadingCard
    parsingDone={app.loadingProgress.parsingDone}
    parsingTotal={app.loadingProgress.parsingTotal}
    savingDone={app.loadingProgress.savingDone}
    savingTotal={app.loadingProgress.savingTotal}
    stage={app.loadingProgress.stage}
  />
{:else}
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
{/if}
