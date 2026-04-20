<script lang="ts">
  import { goto } from '$app/navigation';
  import FattureResults from '$lib/components/app/FattureResults.svelte';
  import FiltersPanel from '$lib/components/app/FiltersPanel.svelte';
  import LoadingCard from '$lib/components/app/LoadingCard.svelte';
  import { app } from '$lib/stores/app.svelte';

  // Navigate back to landing when all invoices are cleared.
  $effect(() => {
    if (app.fatture.length === 0 && !app.loading && !app.openingProject) {
      goto('/');
    }
  });
</script>

{#if app.loading || app.openingProject}
  <LoadingCard
    parsingDone={app.loadingProgress.parsingDone}
    parsingTotal={app.loadingProgress.parsingTotal}
    savingDone={app.loadingProgress.savingDone}
    savingTotal={app.loadingProgress.savingTotal}
    stage={app.loadingProgress.stage}
  />

{:else}
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
    <FiltersPanel
      filters={app.filters}
      fatture={app.fatture}
      activeFilters={app.activeFilters}
      onreset={app.resetFilters}
    />
    <FattureResults
      filtrate={app.filtrate}
      fattureCount={app.fatture.length}
      isDirty={app.isDirty}
      currentProjectName={app.currentProject?.name ?? null}
      onaddfile={app.processFiles}
      onreset={app.resetFilters}
      onsave={app.handleSaveClick}
      removeInvoice={app.handleRemoveInvoice}
    />
  </div>
{/if}
