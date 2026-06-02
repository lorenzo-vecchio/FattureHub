<script lang="ts">
  import type { Report } from '$lib/ai-reports';
  import { marked } from 'marked';
  import ReportBlockRenderer from './report/ReportBlockRenderer.svelte';
  import ReportHeader from './report/ReportHeader.svelte';

  let {
    report,
    showHeader = false,
  }: {
    report: Report;
    showHeader?: boolean;
  } = $props();

  // Configure marked for clean output
  marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(md: string): string {
    const html = marked.parse(md);
    return typeof html === 'string' ? html : '';
  }
</script>

<div class="space-y-4">
  {#if showHeader}
    <ReportHeader createdAt={String(report.createdAt)} prompt={report.prompt} />
  {/if}

  {#each report.blocks as block}
    <ReportBlockRenderer {block} {renderMarkdown} />
  {/each}
</div>
