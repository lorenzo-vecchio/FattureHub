<script lang="ts">
  import type { ChatMessage } from './ai-chat-store.svelte';
  import type { AiConfig } from '$lib/ai-config';
  import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '$lib/components/ui/accordion';
  import { ChevronRight, Loader, Sparkles, AlertCircle, Lightbulb } from 'lucide-svelte';
  import { marked } from 'marked';
  import { generateCuriosity } from '$lib/ai-curiosity';

  marked.setOptions({ breaks: true, gfm: true });

  let {
    message,
    config = null,
  }: {
    message: ChatMessage;
    config?: AiConfig | null;
  } = $props();

  let progressOpen = $state(false);
  let curiosities = $state<string[]>([]);
  let loadingCuriosity = $state(false);
  let curiosityTimer: ReturnType<typeof setTimeout> | undefined;

  let latestStep = $derived(
    message.progressSteps && message.progressSteps.length > 0
      ? message.progressSteps[message.progressSteps.length - 1]
      : ''
  );

  $effect(() => {
    if (!message.isProcessing || !config?.showCuriosities || !config.enabled) {
      curiosities = [];
      clearTimeout(curiosityTimer);
      return;
    }

    const startTime = Date.now();

    async function maybeFetchCuriosity() {
      const elapsed = Date.now() - startTime;
      if (elapsed < 5000) {
        // First curiosity after 5 seconds (la chiamata AI aggiunge altri 2-5s)
        curiosityTimer = setTimeout(maybeFetchCuriosity, 5000 - elapsed);
        return;
      }

      loadingCuriosity = true;
      try {
        const fact = await generateCuriosity(config!);
        // Sostituisci la curiosità precedente, non aggiungerla
        curiosities = [fact];
      } catch {
        // Ignore errors
      } finally {
        loadingCuriosity = false;
      }

      // Next curiosity after 25 seconds
      curiosityTimer = setTimeout(maybeFetchCuriosity, 25000);
    }

    curiosityTimer = setTimeout(maybeFetchCuriosity, 5000);

    return () => {
      clearTimeout(curiosityTimer);
    };
  });
</script>

{#if message.role === 'user'}
  <div class="flex justify-end">
    <div class="max-w-[80%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
      {message.content}
    </div>
  </div>
{:else}
  <div class="flex justify-start">
    <div class="max-w-[85%] space-y-2">
      <div class="flex items-center gap-2">
        <div class="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
          <Sparkles class="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span class="text-xs font-medium text-muted-foreground">AI</span>
      </div>

      {#if message.progressSteps && message.progressSteps.length > 0}
        <Accordion type="multiple" value={progressOpen ? ['progress'] : []} onValueChange={(v: string[]) => { progressOpen = v.includes('progress'); }}>
          <AccordionItem value="progress" class="border-0">
            <AccordionTrigger class="rounded-md border bg-muted/30 px-3 py-1.5 text-xs gap-2 hover:no-underline">
              <div class="flex items-center gap-1.5">
                {#if message.isProcessing}
                  <Loader class="h-3 w-3 animate-spin" />
                {/if}
                <span class="text-muted-foreground">
                  {message.isProcessing ? latestStep || 'Elaborazione in corso...' : 'Dettagli elaborazione'}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent class="pb-0">
              <div class="space-y-1 pt-2">
                {#each message.progressSteps as step}
                  <p class="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ChevronRight class="h-3 w-3 shrink-0" />
                    {step}
                  </p>
                {/each}
                {#if message.isProcessing}
                  <p class="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader class="h-3 w-3 animate-spin shrink-0" />
                    In elaborazione...
                  </p>
                {/if}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      {/if}

      {#if curiosities.length > 0}
        <div class="pt-1">
          <div class="flex items-start gap-2 rounded-md border border-dashed border-muted-foreground/20 bg-muted/20 px-3 py-2">
            <Lightbulb class="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p class="text-xs leading-relaxed text-muted-foreground">Lo sapevi che: {curiosities[curiosities.length - 1]}</p>
          </div>
        </div>
      {/if}

      {#if message.error}
        <div class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
          <div class="flex items-start gap-2">
            <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p class="text-xs text-destructive">{message.error}</p>
          </div>
        </div>
      {/if}

      {#if message.content && !message.error}
        <div class="prose prose-sm dark:prose-invert max-w-none rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-sm
          [&_p]:leading-relaxed [&_p]:my-1
          [&_ul]:my-1 [&_ul]:pl-4 [&_li]:my-0.5
          [&_ol]:my-1 [&_ol]:pl-4
          [&_strong]:font-semibold
          [&_hr]:my-2">
          {@html marked.parse(message.content)}
        </div>
      {/if}

      {#if message.isProcessing}
        <div class="flex items-center gap-2 px-1 pt-2">
          <div class="flex gap-1">
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" style="animation-delay: 0ms"></span>
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" style="animation-delay: 150ms"></span>
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" style="animation-delay: 300ms"></span>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
