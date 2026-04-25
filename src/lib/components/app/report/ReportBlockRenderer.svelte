<script lang="ts">
  import type { ReportBlock } from '$lib/ai-reports';
  import ReportTable from '../ReportTable.svelte';

  let {
    block,
    renderMarkdown,
  }: {
    block: ReportBlock;
    renderMarkdown: (markdown: string) => string;
  } = $props();
</script>

{#if block.type === 'text'}
  <div class="prose prose-sm dark:prose-invert max-w-none
    [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-1
    [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1
    [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-0.5
    [&_p]:leading-relaxed [&_p]:my-1
    [&_ul]:my-1 [&_ul]:pl-4 [&_li]:my-0.5
    [&_ol]:my-1 [&_ol]:pl-4
    [&_strong]:font-semibold
    [&_hr]:my-3">
    {@html renderMarkdown(block.content)}
  </div>
{:else if block.type === 'table'}
  <ReportTable block={block} />
{/if}
