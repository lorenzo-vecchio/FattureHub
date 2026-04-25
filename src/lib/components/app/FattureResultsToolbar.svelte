<script lang="ts">
  import FattureToolbarActions from './toolbar/FattureToolbarActions.svelte';
  import ResultsCounter from './toolbar/ResultsCounter.svelte';

  let {
    resultsCount,
    fattureCount,
    isDirty,
    currentProjectName,
    onaddfile,
    onsave,
    onopenexport,
  }: {
    resultsCount: number;
    fattureCount: number;
    isDirty: boolean;
    currentProjectName: string | null;
    onaddfile: (files: File[]) => void;
    onsave: () => void;
    onopenexport: () => void;
  } = $props();

</script>

<div class="flex flex-wrap items-center justify-between gap-2 mb-5">
  <ResultsCounter {resultsCount} {fattureCount} />
  <FattureToolbarActions
    {isDirty}
    {currentProjectName}
    {resultsCount}
    addFiles={onaddfile}
    saveProject={onsave}
    openExport={onopenexport}
  />
</div>
