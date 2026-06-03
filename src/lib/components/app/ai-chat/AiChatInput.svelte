<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { app } from '$lib/stores/app.svelte';
  import { Send, Square, FolderArchive } from 'lucide-svelte';
  import type { ProjectMeta } from '$lib/projects';

  let {
    value,
    isProcessing,
    contextProjects,
    onsend,
    onstop,
    onInputChange,
    onaddcontext,
  }: {
    value: string;
    isProcessing: boolean;
    contextProjects: ProjectMeta[];
    onsend: () => void;
    onstop: () => void;
    onInputChange: (v: string) => void;
    onaddcontext: (project: ProjectMeta) => void;
  } = $props();

  let textareaEl: HTMLTextAreaElement | undefined = $state();
  let mentionOpen = $state(false);
  let mentionQuery = $state('');
  let mentionIndex = $state(-1);

  const maxLines = 5;
  let lineHeight = 0;

  let availableProjects = $derived(
    app.projectsList.filter((p) => !contextProjects.some((cp) => cp.id === p.id))
  );

  let filteredMentions = $derived(
    mentionQuery.trim()
      ? availableProjects.filter((p) =>
          p.name.toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : availableProjects
  );

  function resize() {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    const capped = Math.min(textareaEl.scrollHeight, lineHeight * maxLines + 20);
    textareaEl.style.height = capped + 'px';
    textareaEl.style.overflowY = textareaEl.scrollHeight > capped ? 'auto' : 'hidden';
  }

  function handleInput(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    const val = el.value;
    onInputChange(val);

    const cursorPos = el.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      mentionQuery = atMatch[1];
      mentionOpen = true;
      mentionIndex = -1;
    } else {
      mentionOpen = false;
      mentionQuery = '';
      mentionIndex = -1;
    }

    resize();
  }

  function selectMention(project: ProjectMeta) {
    const cursorPos = textareaEl?.selectionStart ?? 0;
    const textBefore = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      const newText = textBefore.slice(0, atMatch.index) + textAfter;
      onInputChange(newText);
      onaddcontext(project);
    }
    mentionOpen = false;
    mentionQuery = '';
    mentionIndex = -1;

    requestAnimationFrame(() => {
      if (textareaEl) {
        const newPos = (atMatch ? atMatch.index : 0) ?? 0;
        textareaEl.setSelectionRange(newPos, newPos);
        textareaEl.focus();
      }
    });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (mentionOpen && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        mentionIndex = Math.min(mentionIndex + 1, filteredMentions.length - 1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        mentionIndex = Math.max(mentionIndex - 1, 0);
        return;
      }
      if (e.key === 'Enter' && mentionIndex >= 0) {
        e.preventDefault();
        selectMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        mentionOpen = false;
        mentionQuery = '';
        mentionIndex = -1;
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onsend();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const el = e.target as HTMLTextAreaElement;
      const val = el.value;
      const cursorPos = el.selectionStart;
      const textBeforeCursor = val.slice(0, cursorPos);
      const atMatch = textBeforeCursor.match(/@(\w*)$/);

      if (atMatch) {
        mentionQuery = atMatch[1];
        mentionOpen = true;
      } else {
        mentionOpen = false;
        mentionQuery = '';
        mentionIndex = -1;
      }
    }
  }

  $effect(() => {
    void value;
    if (textareaEl) {
      const computed = getComputedStyle(textareaEl);
      lineHeight = parseFloat(computed.lineHeight) || 21;
    }
    resize();
  });
</script>

<div class="border-t bg-background px-4 py-3">
  <div class="relative mx-auto max-w-3xl">
    {#if mentionOpen && filteredMentions.length > 0}
      <div
        class="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-lg border bg-popover p-1 shadow-md"
      >
        <div class="max-h-48 overflow-y-auto space-y-0.5">
          {#each filteredMentions as project, i (project.id)}
            <button
              onclick={() => selectMention(project)}
              onmouseenter={() => (mentionIndex = i)}
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors text-left
                {i === mentionIndex ? 'bg-accent' : 'hover:bg-accent'}"
            >
              <FolderArchive class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span class="truncate">{project.name}</span>
              <span class="ml-auto text-muted-foreground">{project.count}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="flex items-end gap-2">
      <textarea
        bind:this={textareaEl}
        value={value}
        disabled={isProcessing}
        placeholder="Scrivi una richiesta per l'Assistente AI... (usa @ per menzionare un progetto)"
        rows={1}
        class="min-h-[40px] flex-1 resize-none overflow-y-hidden rounded-xl border bg-muted/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        oninput={handleInput}
        onkeydown={handleKeydown}
        onkeyup={handleKeyUp}
      ></textarea>
      {#if isProcessing}
        <Button variant="destructive" size="icon" class="h-10 w-10 shrink-0 rounded-xl" onclick={onstop} title="Interrompi">
          <Square class="h-4 w-4 fill-current" />
        </Button>
      {:else}
        <Button size="icon" class="h-10 w-10 shrink-0 rounded-xl" disabled={!value.trim()} onclick={onsend} title="Invia">
          <Send class="h-4 w-4" />
        </Button>
      {/if}
    </div>
    <p class="mt-1 text-center text-[10px] text-muted-foreground">
      Premi Invio per inviare &middot; Maiusc+Invio per andare a capo &middot; @ per menzionare un progetto
    </p>
  </div>
</div>
