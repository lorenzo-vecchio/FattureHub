<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { app } from '$lib/stores/app.svelte';
  import { chatStore } from '$lib/components/app/ai-chat/ai-chat-store.svelte';
  import { loadReportById, type Report } from '$lib/ai-reports';
  import type { ProjectMeta } from '$lib/projects';
  import AiChatShell from '$lib/components/app/ai-chat/AiChatShell.svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  let overwriteDialogOpen = $state(false);
  let pendingReport = $state<Report | null>(null);
  let pendingProjectMeta = $state<ProjectMeta | null>(null);

  onMount(async () => {
    const reportId = $page.url.searchParams.get('report');

    if (reportId) {
      const report = await loadReportById(reportId);
      if (!report) return;

      const projectMeta = report.projectId
        ? app.projectsList.find((p) => p.id === report.projectId) ?? null
        : null;

      // Se l'AI sta girando, chiedi conferma
      if (chatStore.isProcessing) {
        pendingReport = report;
        pendingProjectMeta = projectMeta;
        overwriteDialogOpen = true;
        return;
      }

      // Se c'è un'altra sessione con report, salva automaticamente prima di sostituire
      if (chatStore.currentReport && chatStore.messages.length > 0) {
        await chatStore.saveCurrentReport();
      }

      loadReport(report, projectMeta);
    } else if (!chatStore.isProcessing) {
      // Nessun report richiesto e AI ferma: nuova sessione pulita
      // (se l'AI sta girando, mantieni la sessione corrente visibile)
      chatStore.clearChat();
      chatStore.clearContextProjects();
    }

    // Aggiungi il progetto corrente se presente
    if (app.currentProject) {
      const meta = app.projectsList.find((p) => p.id === app.currentProject!.id);
      if (meta && !chatStore.contextProjects.some((p) => p.id === meta.id)) {
        chatStore.addContextProject(meta);
      }
    }
  });

  function loadReport(report: Report, projectMeta: ProjectMeta | null) {
    chatStore.clearChat();
    chatStore.setCurrentReport(report);
    if (projectMeta && !chatStore.contextProjects.some((p) => p.id === projectMeta.id)) {
      chatStore.addContextProject(projectMeta);
    }
  }

  function handleOverwriteConfirm() {
    if (!pendingReport) return;
    chatStore.stopProcessing(); // interrompe l'elaborazione
    loadReport(pendingReport, pendingProjectMeta);
    pendingReport = null;
    pendingProjectMeta = null;
    overwriteDialogOpen = false;
  }

  function handleOverwriteCancel() {
    pendingReport = null;
    pendingProjectMeta = null;
    overwriteDialogOpen = false;
  }

  function handleClose() {
    goto('/workspace');
  }
</script>

<Dialog.Root bind:open={overwriteDialogOpen}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="sm:max-w-[400px]">
      <Dialog.Header>
        <Dialog.Title>AI in elaborazione</Dialog.Title>
        <Dialog.Description>
          L'AI sta ancora elaborando la richiesta corrente. Se apri un altro report l'elaborazione verrà interrotta.
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="flex gap-2">
        <Button variant="outline" onclick={handleOverwriteCancel}>Annulla</Button>
        <Button variant="default" onclick={handleOverwriteConfirm}>Interrompi e apri</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<div class="flex h-full flex-col">
  <AiChatShell
    messages={chatStore.messages}
    inputValue={chatStore.inputValue}
    isProcessing={chatStore.isProcessing}
    currentReport={chatStore.currentReport}
    contextProjects={chatStore.contextProjects}
    config={app.aiConfig}
    onsend={() => chatStore.sendMessage(chatStore.inputValue, app.aiConfig, (v: boolean) => (app.isAiRunningWritable = v))}
    onstop={() => { chatStore.stopProcessing(); app.isAiRunningWritable = false; }}
    onInputChange={(v: string) => (chatStore.inputValue = v)}
    onclear={() => chatStore.clearChat()}
    onsave={() => chatStore.saveCurrentReport()}
    onclose={handleClose}
    onaddcontext={(p: ProjectMeta) => chatStore.addContextProject(p)}
    onremovecontext={(id: string) => chatStore.removeContextProject(id)}
  />
</div>
