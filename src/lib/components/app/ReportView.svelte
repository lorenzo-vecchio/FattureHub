<script lang="ts">
  import { marked } from 'marked';
  import type { Report } from '$lib/ai-reports';
  import ReportTable from './ReportTable.svelte';

  let { report }: { report: Report } = $props();

  const dateStr = $derived(new Date(report.createdAt).toLocaleString('it-IT'));

  // Configure marked for clean output
  marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(md: string): string {
    const html = marked.parse(md);
    return typeof html === 'string' ? html : '';
  }
</script>

<div class="space-y-4">
  <div class="space-y-1">
    <p class="text-xs text-muted-foreground">{dateStr}</p>
    <p class="text-sm italic text-muted-foreground line-clamp-2">"{report.prompt}"</p>
  </div>

  {#each report.blocks as block}
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
      <ReportTable {block} />
    {/if}
  {/each}
</div>
