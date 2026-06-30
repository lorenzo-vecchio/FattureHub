// Carica i prompt markdown come testi tramite Vite ?raw
// I file .md in questa cartella sono revisionabili dall'utente.

import corePrompt from './system-core.md?raw';
import workflowRules from './analysis-workflow.md?raw';

export interface PromptContext {
  data: string;
  numFatture: number;
  workspaceStato: string;
  pianoCorrente?: string;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  let prompt = corePrompt
    .replace('{{DATA}}', ctx.data)
    .replace('{{NUM_FATTURE}}', String(ctx.numFatture))
    .replace('{{WORKSPACE_STATO}}', ctx.workspaceStato);

  if (ctx.pianoCorrente) {
    prompt += `\n\n## Piano corrente\n${ctx.pianoCorrente}`;
  }

  prompt += `\n\n${workflowRules}`;

  return prompt;
}
