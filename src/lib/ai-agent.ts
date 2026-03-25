import { generateText, stepCountIs, hasToolCall } from 'ai';
import type { ModelMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { tauriFetch } from './ai-fetch';
import type { AiConfig } from './ai-config';
import type { Fattura } from './parser';
import type { Report, ReportBlock, TableBlock } from './ai-reports';

// ── Schemas ───────────────────────────────────────────────────────────────────

const textBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
});

const tableRefSchema = z.object({
  type: z.literal('table_ref'),
  tableId: z.string(),
  title: z.string().optional(),
});

const inlineTableSchema = z.object({
  type: z.literal('table'),
  title: z.string().optional(),
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.string(), z.string())),
});

const reportBlocksSchema = z.array(z.union([textBlockSchema, tableRefSchema, inlineTableSchema]));

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildModel(config: AiConfig, role: 'orchestrator' | 'task' = 'orchestrator'): any {
  const modelName = role === 'task'
    ? (config.taskModel || config.model)
    : (config.orchestratorModel || config.model);

  if (config.provider === 'anthropic') {
    const provider = createAnthropic({
      apiKey: config.apiKey,
      ...(config.endpoint ? { baseURL: config.endpoint } : {}),
      fetch: tauriFetch as typeof fetch,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (provider as any)(modelName);
  }
  const provider = createOpenAI({
    apiKey: config.apiKey,
    ...(config.endpoint ? { baseURL: config.endpoint } : {}),
    fetch: tauriFetch as typeof fetch,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (provider as any).chat(modelName);
}

function extractLineeFromXml(rawXml: string): Fattura['lineeDettaglio'] {
  try {
    const doc = new DOMParser().parseFromString(rawXml, 'application/xml');
    if (doc.querySelector('parsererror')) return [];
    return Array.from(doc.querySelectorAll('DettaglioLinee'))
      .map(l => {
        const txt = (tag: string) => l.querySelector(tag)?.textContent?.trim() ?? '';
        const num = (tag: string) => { const v = parseFloat(txt(tag).replace(',', '.')); return isNaN(v) ? undefined : v; };
        return {
          descrizione: txt('Descrizione'),
          quantita: num('Quantita'),
          unitaMisura: txt('UnitaMisura') || undefined,
          prezzoUnitario: num('PrezzoUnitario'),
          importo: num('PrezzoTotale'),
        };
      })
      .filter(l => l.descrizione);
  } catch {
    return [];
  }
}

function cedenteLabel(f: Fattura): string {
  return f.cedenteDenominazione ||
    [f.cedenteNome, f.cedenteCognome].filter(Boolean).join(' ') ||
    f.cedentePiva || f.cedenteCodFiscale || '—';
}

function fatturaToCondensed(f: Fattura) {
  return {
    fileName: f.fileName,
    numero: f.numero,
    data: f.data,
    tipoDocumento: f.tipoDocumento,
    cedente: cedenteLabel(f),
    cessionario: f.cessionarioDenominazione || f.cessionarioPiva,
    importoTotale: f.importoTotale,
    imponibile: f.imponibile,
    imposta: f.imposta,
    valuta: f.valuta,
  };
}

function fatturaToDetails(f: Fattura) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { rawXml, ...rest } = f;
  return rest;
}

/** Extract unit weight from a product description. Returns weight in KG or LT. */
function extractUnitWeight(desc: string): { weight: number; unitNorm: 'KG' | 'LT' } | null {
  const s = desc.toUpperCase();
  const patterns: [RegExp, (m: RegExpMatchArray) => { weight: number; unitNorm: 'KG' | 'LT' } | null][] = [
    [/\bKG[.\s]?(\d+(?:[.,]\d+)?)/,   (m) => ({ weight: parseFloat(m[1].replace(',', '.')), unitNorm: 'KG' })],
    [/(\d+(?:[.,]\d+)?)[.\s]?KG\b/,   (m) => ({ weight: parseFloat(m[1].replace(',', '.')), unitNorm: 'KG' })],
    [/\bGR[.\s]?(\d+(?:[.,]\d+)?)/,   (m) => ({ weight: parseFloat(m[1].replace(',', '.')) / 1000, unitNorm: 'KG' })],
    [/(\d+(?:[.,]\d+)?)[.\s]?GR\b/,   (m) => ({ weight: parseFloat(m[1].replace(',', '.')) / 1000, unitNorm: 'KG' })],
    [/\bG[.\s]?(\d+(?:[.,]\d+)?)/,    (m) => ({ weight: parseFloat(m[1].replace(',', '.')) / 1000, unitNorm: 'KG' })],
    [/(\d+(?:[.,]\d+)?)[.\s]?G\b/,    (m) => ({ weight: parseFloat(m[1].replace(',', '.')) / 1000, unitNorm: 'KG' })],
    [/\bLT[.\s]?(\d+(?:[.,]\d+)?)/,   (m) => ({ weight: parseFloat(m[1].replace(',', '.')), unitNorm: 'LT' })],
    [/(\d+(?:[.,]\d+)?)[.\s]?LT\b/,   (m) => ({ weight: parseFloat(m[1].replace(',', '.')), unitNorm: 'LT' })],
    [/\bML[.\s]?(\d+(?:[.,]\d+)?)/,   (m) => ({ weight: parseFloat(m[1].replace(',', '.')) / 1000, unitNorm: 'LT' })],
    [/(\d+(?:[.,]\d+)?)[.\s]?ML\b/,   (m) => ({ weight: parseFloat(m[1].replace(',', '.')) / 1000, unitNorm: 'LT' })],
    [/\bCL[.\s]?(\d+(?:[.,]\d+)?)/,   (m) => ({ weight: parseFloat(m[1].replace(',', '.')) / 100, unitNorm: 'LT' })],
    [/(\d+(?:[.,]\d+)?)[.\s]?CL\b/,   (m) => ({ weight: parseFloat(m[1].replace(',', '.')) / 100, unitNorm: 'LT' })],
  ];
  for (const [re, fn] of patterns) {
    const m = s.match(re);
    if (m) {
      const result = fn(m);
      if (result && result.weight > 0) return result;
    }
  }
  return null;
}

function estimateTokens(messages: ModelMessage[]): number {
  return Math.ceil(JSON.stringify(messages).length / 3.5);
}

async function compressContext(
  messages: ModelMessage[],
  plan: string,
  config: AiConfig,
  abortSignal?: AbortSignal,
): Promise<string> {
  const compressModel = buildModel(config, 'orchestrator');
  try {
    const result = await generateText({
      model: compressModel,
      system: 'Sei un assistente che riassume sessioni di analisi. Produci un riassunto conciso in italiano di ciò che è stato fatto e dei risultati ottenuti.',
      prompt: `Riassumi questa sessione di lavoro in 200 parole massimo:\n\nPIANO: ${plan || 'nessuno'}\n\nMESSAGGI:\n${JSON.stringify(messages.slice(-20))}`,
      abortSignal,
    });
    return result.text;
  } catch {
    return '[Sommario non disponibile]';
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AggregateProduct = {
  descrizione: string;
  unitaMisura: string | null;
  quantitaTotale: number;
  occorrenze: number;
  pesoTotale: number | null;
  pesoUnitaNorm: 'KG' | 'LT' | null;
  fornitori: { fornitore: string; quantita: number }[];
};

type WorkspaceTable = {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
};

// ── Main agent ────────────────────────────────────────────────────────────────

export async function runAiAgent(opts: {
  prompt: string;
  fatture: Fattura[];
  config: AiConfig;
  projectId: string;
  onProgress: (msg: string) => void;
  conversationMessages?: ModelMessage[];
  abortSignal?: AbortSignal;
}): Promise<{ report: Report; messages: ModelMessage[] }> {
  const { prompt, fatture, config, projectId, onProgress, conversationMessages, abortSignal } = opts;

  const orchestratorModel = buildModel(config, 'orchestrator');
  // Snapshot: strip Svelte 5 reactive proxies (AI SDK uses structuredClone internally)
  const plainFatture = JSON.parse(JSON.stringify(fatture)) as Fattura[];

  // Backfill lineeDettaglio for fatture saved before that field existed
  for (const f of plainFatture) {
    if ((!f.lineeDettaglio || f.lineeDettaglio.length === 0) && f.rawXml) {
      f.lineeDettaglio = extractLineeFromXml(f.rawXml);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  // ── Workspace: named in-memory tables ──────────────────────────────────────
  const workspace = new Map<string, WorkspaceTable>();
  let lastAggregateResult: AggregateProduct[] | null = null;

  // ── Captured report blocks ────────────────────────────────────────────────
  let capturedBlocks: ReportBlock[] | null = null;

  // ── Plan ──────────────────────────────────────────────────────────────────
  let plan = '';

  function buildWorkspaceState(): string {
    if (workspace.size === 0) return '(vuoto)';
    return Array.from(workspace.entries())
      .map(([id, t]) => `• "${id}" — ${t.title} (${t.rows.length} righe, colonne: ${t.columns.map(c => c.key).join(', ')})`)
      .join('\n');
  }

  function buildSystemPrompt(): string {
    let sys = `Sei un orchestratore che analizza fatture elettroniche italiane.
Data: ${today} — Fatture: ${plainFatture.length}`;

    if (plan) {
      sys += `\n\n== PIANO CORRENTE ==\n${plan}`;
    }

    sys += `\n\n== STATO WORKSPACE ==\n${buildWorkspaceState()}`;

    sys += `\n\n== WORKFLOW CONSIGLIATO ==
1. create_plan — registra il piano prima di iniziare
2. aggregate_products — aggrega tutti i prodotti con estrazione automatica del peso
3. group_similar_products — raggruppa prodotti simili in batch (loop finché done=true)
4. workspace_compute — statistiche opzionali
5. finish_report con table_ref — NON riprodurre le righe nel tool call

Rispondi in italiano.`;

    return sys;
  }

  const tools = {
    create_plan: {
      description: 'Registra il piano di analisi prima di iniziare. Il piano sopravvive alla compressione del contesto.',
      inputSchema: z.object({
        planText: z.string().describe('Piano dettagliato in italiano di cosa fare e perché'),
      }),
      execute: async ({ planText }: { planText: string }) => {
        plan = planText;
        onProgress(`create_plan → piano registrato`);
        return { ok: true, message: 'Piano registrato. Procedi con aggregate_products.' };
      },
    },

    aggregate_products: {
      description: 'Aggrega tutte le righe di dettaglio: prodotti unici con quantità totale, peso estratto automaticamente dalla descrizione, e suddivisione per fornitore.',
      inputSchema: z.object({
        search: z.string().optional().describe('Filtra descrizione prodotto (parziale)'),
        cedente: z.string().optional().describe('Filtra fornitore (parziale)'),
        unitaMisura: z.string().optional().describe('Filtra unità di misura (es. KG, LT)'),
        minQty: z.number().optional().describe('Solo prodotti con quantità totale ≥ valore'),
        sortBy: z.enum(['qty', 'name', 'occurrences']).optional().default('qty'),
      }),
      execute: async (args: { search?: string; cedente?: string; unitaMisura?: string; minQty?: number; sortBy?: 'qty' | 'name' | 'occurrences' }) => {
        type Entry = {
          unit: string;
          totalQty: number;
          bySupplier: Record<string, number>;
          count: number;
          pesoTotale: number | null;
          pesoUnitaNorm: 'KG' | 'LT' | null;
        };
        const map = new Map<string, Entry>();

        for (const f of plainFatture) {
          const fornitore = cedenteLabel(f);
          if (args.cedente && !fornitore.toLowerCase().includes(args.cedente.toLowerCase())) continue;
          for (const l of f.lineeDettaglio ?? []) {
            if (!l.descrizione) continue;
            if (args.search && !l.descrizione.toLowerCase().includes(args.search.toLowerCase())) continue;
            const unit = l.unitaMisura ?? '';
            if (args.unitaMisura && unit.toLowerCase() !== args.unitaMisura.toLowerCase()) continue;
            const key = `${l.descrizione.trim()}|||${unit}`;
            const entry = map.get(key) ?? { unit, totalQty: 0, bySupplier: {}, count: 0, pesoTotale: null, pesoUnitaNorm: null };
            entry.totalQty += l.quantita ?? 0;
            entry.count++;
            entry.bySupplier[fornitore] = (entry.bySupplier[fornitore] ?? 0) + (l.quantita ?? 0);

            // Extract weight from description
            const uw = extractUnitWeight(l.descrizione);
            if (uw && l.quantita != null) {
              if (entry.pesoTotale === null) entry.pesoTotale = 0;
              entry.pesoTotale += l.quantita * uw.weight;
              entry.pesoUnitaNorm = uw.unitNorm;
            }

            map.set(key, entry);
          }
        }

        let results: AggregateProduct[] = Array.from(map.entries()).map(([key, e]) => {
          const [descrizione] = key.split('|||');
          return {
            descrizione,
            unitaMisura: e.unit || null,
            quantitaTotale: Math.round(e.totalQty * 1000) / 1000,
            occorrenze: e.count,
            pesoTotale: e.pesoTotale != null ? Math.round(e.pesoTotale * 1000) / 1000 : null,
            pesoUnitaNorm: e.pesoUnitaNorm,
            fornitori: Object.entries(e.bySupplier)
              .sort((a, b) => b[1] - a[1])
              .map(([fornitore, qty]) => ({ fornitore, quantita: Math.round(qty * 1000) / 1000 })),
          };
        });

        if (args.minQty != null) results = results.filter(r => r.quantitaTotale >= args.minQty!);
        const sortBy = args.sortBy ?? 'qty';
        results.sort((a, b) =>
          sortBy === 'name' ? a.descrizione.localeCompare(b.descrizione, 'it') :
          sortBy === 'occurrences' ? b.occorrenze - a.occorrenze :
          b.quantitaTotale - a.quantitaTotale
        );

        lastAggregateResult = results;

        const withWeight = results.filter(r => r.pesoTotale != null).length;
        onProgress(`aggregate_products → ${results.length} prodotti unici (${withWeight} con peso estratto)`);

        return {
          totalProducts: results.length,
          totalLines: Array.from(map.values()).reduce((s, e) => s + e.count, 0),
          withWeightExtracted: withWeight,
          topProducts: results.slice(0, 10).map(p => ({
            descrizione: p.descrizione,
            unitaMisura: p.unitaMisura,
            quantitaTotale: p.quantitaTotale,
            occorrenze: p.occorrenze,
            pesoTotale: p.pesoTotale,
            pesoUnitaNorm: p.pesoUnitaNorm,
          })),
          message: `Dati completi (${results.length} prodotti) in memoria. Usa workspace_from_aggregate o group_similar_products per elaborare.`,
        };
      },
    },

    group_similar_products: {
      description: 'Raggruppa prodotti simili (stesso prodotto in formati/packaging diversi) usando il task model. Chiama in loop incrementando startIndex finché done=true.',
      inputSchema: z.object({
        outputTableId: z.string().describe('ID della tabella workspace da creare/aggiornare'),
        outputTitle: z.string().describe('Titolo della tabella'),
        startIndex: z.number().int().min(0).default(0).describe('Indice di partenza nel risultato di aggregate_products'),
        batchSize: z.number().int().min(1).max(150).default(80).describe('Numero di prodotti da processare in questo batch'),
        context: z.string().optional().describe('Contesto aggiuntivo per il raggruppamento'),
      }),
      execute: async (args: { outputTableId: string; outputTitle: string; startIndex: number; batchSize: number; context?: string }) => {
        if (!lastAggregateResult) return { error: 'Chiama prima aggregate_products' };

        const batch = lastAggregateResult.slice(args.startIndex, args.startIndex + args.batchSize);
        if (batch.length === 0) {
          return { done: true, processedInBatch: 0, groupsInBatch: 0, totalRowsInTable: workspace.get(args.outputTableId)?.rows.length ?? 0, nextStartIndex: args.startIndex, message: 'Batch vuoto — tutti i prodotti processati.' };
        }

        // Get existing group names for context (first 60)
        const existingTable = workspace.get(args.outputTableId);
        const existingGroups = existingTable
          ? existingTable.rows.slice(0, 60).map(r => r['nomeCanoniche'] ?? r['canonicalName'] ?? '').filter(Boolean)
          : [];

        // Strip fornitori to save tokens
        const batchInput = batch.map(p => ({
          descrizione: p.descrizione,
          quantitaTotale: p.quantitaTotale,
          unitaMisura: p.unitaMisura,
          occorrenze: p.occorrenze,
          pesoTotale: p.pesoTotale,
          pesoUnitaNorm: p.pesoUnitaNorm,
        }));

        const taskModel = buildModel(config, 'task');
        let parsed: Array<{ canonicalName: string; unit: string; totalWeight: number; occurrences: number }> = [];

        try {
          const taskResult = await generateText({
            model: taskModel,
            system: `Sei un normalizzatore di prodotti per fatture italiane.
Per ogni prodotto nel batch:
1. RAGGRUPPA prodotti con lo stesso nome ma varianti (packaging, formato)
   "KG.10 FARINA OO ORO 5 STAGIONI" e "KG 10 FARINA 00 ORO" → stesso gruppo
   MA "FARINA 00" ≠ "FARINA INTEGRALE" (prodotti diversi)
2. ESTRAI peso/volume dal nome del prodotto:
   "KG.10 FARINA" → 10 KG per unità
   "GR500 LIEVITO" → 0.5 KG per unità (÷1000)
   "ML500 OLIO" → 0.5 LT per unità
3. CALCOLA peso totale = peso_unitario × quantitaTotale
   "KG.10 FARINA OO ORO" × 329 colli = 3290 KG
4. Se il peso non è estraibile, usa quantitaTotale come occorrenze con unit "PZ"
${existingGroups.length > 0 ? `GRUPPI ESISTENTI (usa questi nomi se applicabile): ${existingGroups.join(', ')}` : ''}
${args.context ? `CONTESTO: ${args.context}` : ''}
Rispondi SOLO JSON (no markdown): [{"canonicalName":"...","unit":"KG","totalWeight":3290,"occurrences":329}]`,
            prompt: JSON.stringify(batchInput),
            abortSignal,
          });

          // Strip markdown fences if present
          let raw = taskResult.text.trim();
          const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (fenceMatch) raw = fenceMatch[1].trim();
          parsed = JSON.parse(raw);
        } catch {
          // Fallback: passthrough
          parsed = batch.map(p => ({
            canonicalName: p.descrizione,
            unit: p.pesoUnitaNorm ?? 'PZ',
            totalWeight: p.pesoTotale ?? p.quantitaTotale,
            occurrences: p.occorrenze,
          }));
        }

        // Merge into workspace table
        if (!existingTable) {
          workspace.set(args.outputTableId, {
            title: args.outputTitle,
            columns: [
              { key: 'nomeCanoniche', label: 'Prodotto' },
              { key: 'unita', label: 'Unità' },
              { key: 'pesoTotale', label: 'Peso/Qtà Totale' },
              { key: 'occorrenze', label: 'Occorrenze' },
            ],
            rows: [],
          });
        }
        const table = workspace.get(args.outputTableId)!;

        for (const g of parsed) {
          const key = (g.canonicalName ?? '').toLowerCase().trim();
          const existingIdx = table.rows.findIndex(r => (r['nomeCanoniche'] ?? '').toLowerCase().trim() === key);
          if (existingIdx >= 0) {
            const existing = table.rows[existingIdx];
            const prevWeight = parseFloat(existing['pesoTotale'] ?? '0') || 0;
            const prevOcc = parseInt(existing['occorrenze'] ?? '0') || 0;
            table.rows[existingIdx] = {
              ...existing,
              pesoTotale: String(Math.round((prevWeight + (g.totalWeight ?? 0)) * 1000) / 1000),
              occorrenze: String(prevOcc + (g.occurrences ?? 0)),
            };
          } else {
            table.rows.push({
              nomeCanoniche: g.canonicalName ?? '',
              unita: g.unit ?? 'PZ',
              pesoTotale: String(Math.round((g.totalWeight ?? 0) * 1000) / 1000),
              occorrenze: String(g.occurrences ?? 0),
            });
          }
        }

        const nextStartIndex = args.startIndex + batch.length;
        const done = nextStartIndex >= lastAggregateResult.length;

        onProgress(`group_similar_products → batch ${args.startIndex}-${nextStartIndex - 1}: ${parsed.length} gruppi (tabella: ${table.rows.length} righe)`);

        return {
          processedInBatch: batch.length,
          groupsInBatch: parsed.length,
          totalRowsInTable: table.rows.length,
          nextStartIndex,
          done,
          message: done
            ? `Raggruppamento completato. Tabella "${args.outputTableId}" ha ${table.rows.length} righe. Usa finish_report con table_ref.`
            : `Continua con startIndex=${nextStartIndex} (processati ${nextStartIndex}/${lastAggregateResult.length}).`,
        };
      },
    },

    workspace_from_aggregate: {
      description: 'Crea una tabella workspace dal risultato dell\'ultima aggregate_products. Usa table_ref in finish_report.',
      inputSchema: z.object({
        tableId: z.string().describe('Identificatore univoco della tabella (es. "prodotti")'),
        title: z.string().describe('Titolo della tabella'),
        mode: z.enum(['by_product', 'by_product_supplier']).optional().default('by_product'),
        search: z.string().optional(),
        minQty: z.number().optional(),
      }),
      execute: async (args: { tableId: string; title: string; mode?: 'by_product' | 'by_product_supplier'; search?: string; minQty?: number }) => {
        if (!lastAggregateResult) return { error: 'Chiama prima aggregate_products' };

        let source = lastAggregateResult;
        if (args.search) {
          const q = args.search.toLowerCase();
          source = source.filter(p => p.descrizione.toLowerCase().includes(q));
        }
        if (args.minQty != null) source = source.filter(p => p.quantitaTotale >= args.minQty!);

        let columns: { key: string; label: string }[];
        let rows: Record<string, string>[];

        if (args.mode === 'by_product_supplier') {
          columns = [
            { key: 'prodotto', label: 'Prodotto' },
            { key: 'unitaMisura', label: 'U.M.' },
            { key: 'fornitore', label: 'Fornitore' },
            { key: 'quantita', label: 'Quantità' },
          ];
          rows = source.flatMap(p =>
            p.fornitori.map(f => ({
              prodotto: p.descrizione,
              unitaMisura: p.unitaMisura ?? '',
              fornitore: f.fornitore,
              quantita: String(f.quantita),
            }))
          );
        } else {
          columns = [
            { key: 'prodotto', label: 'Prodotto' },
            { key: 'unitaMisura', label: 'U.M.' },
            { key: 'quantitaTotale', label: 'Quantità Totale' },
            { key: 'occorrenze', label: 'Occorrenze' },
          ];
          // Add peso column if any product has weight
          const hasWeight = source.some(p => p.pesoTotale != null);
          if (hasWeight) {
            columns.push({ key: 'pesoTotale', label: 'Peso Totale' });
            columns.push({ key: 'pesoUnita', label: 'U.M. Peso' });
          }
          rows = source.map(p => {
            const r: Record<string, string> = {
              prodotto: p.descrizione,
              unitaMisura: p.unitaMisura ?? '',
              quantitaTotale: String(p.quantitaTotale),
              occorrenze: String(p.occorrenze),
            };
            if (hasWeight) {
              r['pesoTotale'] = p.pesoTotale != null ? String(p.pesoTotale) : '';
              r['pesoUnita'] = p.pesoUnitaNorm ?? '';
            }
            return r;
          });
        }

        workspace.set(args.tableId, { title: args.title, columns, rows });
        onProgress(`workspace_from_aggregate → tabella "${args.tableId}": ${rows.length} righe`);
        return {
          tableId: args.tableId,
          totalRows: rows.length,
          message: `Tabella "${args.tableId}" pronta. Aggiungila al report con { "type": "table_ref", "tableId": "${args.tableId}" }`,
        };
      },
    },

    workspace_add_rows: {
      description: 'Aggiunge righe manuali a una tabella workspace.',
      inputSchema: z.object({
        tableId: z.string(),
        title: z.string().optional(),
        columns: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
        rows: z.array(z.record(z.string(), z.string())),
        mode: z.enum(['append', 'replace']).optional().default('append'),
      }),
      execute: async (args: { tableId: string; title?: string; columns?: { key: string; label: string }[]; rows: Record<string, string>[]; mode?: 'append' | 'replace' }) => {
        const existing = workspace.get(args.tableId);
        if (args.mode === 'replace' || !existing) {
          workspace.set(args.tableId, {
            title: args.title ?? args.tableId,
            columns: args.columns ?? existing?.columns ?? [],
            rows: [],
          });
        } else if (args.title) {
          existing.title = args.title;
        }
        const table = workspace.get(args.tableId)!;
        table.rows.push(...args.rows);
        onProgress(`workspace_add_rows → "${args.tableId}": ${table.rows.length} righe totali`);
        return { tableId: args.tableId, totalRows: table.rows.length, added: args.rows.length };
      },
    },

    workspace_compute: {
      description: 'Calcola una statistica su una colonna numerica di una tabella workspace.',
      inputSchema: z.object({
        tableId: z.string(),
        columnKey: z.string(),
        operation: z.enum(['sum', 'count', 'avg', 'min', 'max', 'unique_count']),
        label: z.string().optional(),
      }),
      execute: async (args: { tableId: string; columnKey: string; operation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'unique_count'; label?: string }) => {
        const table = workspace.get(args.tableId);
        if (!table) return { error: `Tabella non trovata: ${args.tableId}` };
        if (args.operation === 'unique_count') {
          const count = new Set(table.rows.map(r => r[args.columnKey])).size;
          return { tableId: args.tableId, columnKey: args.columnKey, operation: args.operation, result: count };
        }
        if (args.operation === 'count') {
          return { tableId: args.tableId, columnKey: args.columnKey, operation: 'count', result: table.rows.length };
        }
        const values = table.rows.map(r => parseFloat(r[args.columnKey] ?? '')).filter(v => !isNaN(v));
        if (!values.length) return { error: 'Nessun valore numerico trovato nella colonna' };
        let result: number;
        if (args.operation === 'sum') result = values.reduce((a, b) => a + b, 0);
        else if (args.operation === 'avg') result = values.reduce((a, b) => a + b, 0) / values.length;
        else if (args.operation === 'min') result = Math.min(...values);
        else result = Math.max(...values);
        onProgress(`workspace_compute → ${args.operation}(${args.columnKey}) = ${Math.round(result * 1000) / 1000}`);
        return { tableId: args.tableId, columnKey: args.columnKey, operation: args.operation, result: Math.round(result * 1000) / 1000 };
      },
    },

    list_fatture: {
      description: 'Elenco fatture con totali, senza linee prodotto.',
      inputSchema: z.object({
        cedente: z.string().optional(),
        cessionario: z.string().optional(),
        tipoDocumento: z.string().optional(),
        dataFrom: z.string().optional(),
        dataTo: z.string().optional(),
      }),
      execute: async (args: { cedente?: string; cessionario?: string; tipoDocumento?: string; dataFrom?: string; dataTo?: string }) => {
        let list = plainFatture.map(fatturaToCondensed);
        if (args.cedente) { const q = args.cedente.toLowerCase(); list = list.filter(f => String(f.cedente ?? '').toLowerCase().includes(q)); }
        if (args.cessionario) { const q = args.cessionario.toLowerCase(); list = list.filter(f => String(f.cessionario ?? '').toLowerCase().includes(q)); }
        if (args.tipoDocumento) list = list.filter(f => f.tipoDocumento === args.tipoDocumento);
        if (args.dataFrom) list = list.filter(f => f.data >= args.dataFrom!);
        if (args.dataTo) list = list.filter(f => f.data <= args.dataTo!);
        const total = list.length;
        const truncated = list.length > 100;
        if (truncated) list = list.slice(0, 100);
        onProgress(`list_fatture → ${total} risultati${truncated ? ' (prime 100)' : ''}`);
        return { total, shown: list.length, truncated, items: list };
      },
    },

    get_all_line_items: {
      description: 'Righe grezze paginate (500/pag). Usa aggregate_products per analisi aggregata.',
      inputSchema: z.object({
        page: z.number().int().min(1).optional().default(1),
        cedente: z.string().optional(),
        search: z.string().optional(),
      }),
      execute: async (args: { page?: number; cedente?: string; search?: string }) => {
        const PAGE_SIZE = 500;
        const page = args.page ?? 1;
        type LineItem = { fileName: string; data: string; cedente: string; descrizione: string; quantita: string; unitaMisura: string; prezzoUnitario: string; importo: string };
        let items: LineItem[] = [];
        for (const f of plainFatture) {
          const fornitore = cedenteLabel(f);
          if (args.cedente && !fornitore.toLowerCase().includes(args.cedente.toLowerCase())) continue;
          for (const l of f.lineeDettaglio ?? []) {
            if (!l.descrizione) continue;
            if (args.search && !l.descrizione.toLowerCase().includes(args.search.toLowerCase())) continue;
            items.push({ fileName: f.fileName, data: f.data, cedente: fornitore, descrizione: l.descrizione.slice(0, 120), quantita: l.quantita != null ? String(l.quantita) : '', unitaMisura: l.unitaMisura ?? '', prezzoUnitario: l.prezzoUnitario != null ? String(l.prezzoUnitario) : '', importo: l.importo != null ? String(l.importo) : '' });
          }
        }
        const total = items.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        onProgress(`get_all_line_items → ${total} righe (pag. ${page}/${totalPages})`);
        return { total, page, totalPages, pageSize: PAGE_SIZE, items: pageItems };
      },
    },

    get_fattura_details: {
      description: 'Dettagli di una singola fattura con linee prodotto.',
      inputSchema: z.object({
        fileName: z.string(),
      }),
      execute: async ({ fileName }: { fileName: string }) => {
        const f = plainFatture.find(x => x.fileName === fileName);
        if (!f) return { error: `Fattura non trovata: ${fileName}` };
        onProgress(`get_fattura_details → ${fileName}`);
        return fatturaToDetails(f);
      },
    },

    finish_report: {
      description: 'Consegna il report finale. Usa "table_ref" per referenziare tabelle workspace — NON riprodurre i dati.',
      inputSchema: z.object({
        blocks: reportBlocksSchema,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async ({ blocks }: { blocks: any[] }) => {
        const resolved: ReportBlock[] = blocks.map(b => {
          if (b.type === 'table_ref') {
            const table = workspace.get(b.tableId);
            if (!table) return { type: 'text' as const, content: `[Tabella non trovata: ${b.tableId}]` };
            return {
              type: 'table' as const,
              title: b.title ?? table.title,
              columns: table.columns,
              rows: table.rows,
            } satisfies TableBlock;
          }
          return b as ReportBlock;
        });
        capturedBlocks = resolved;
        onProgress(`Report prodotto (${resolved.length} blocchi)`);
        return 'Report completato con successo.';
      },
    },
  };

  // ── Multi-phase loop ──────────────────────────────────────────────────────

  const originalPrompt = prompt;
  const contextWindow = config.contextWindow ?? 0;

  let messages: ModelMessage[] = conversationMessages
    ? [...conversationMessages, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  for (let phase = 0; phase < 8; phase++) {
    const result = await generateText({
      model: orchestratorModel,
      system: buildSystemPrompt(),
      messages,
      tools,
      toolChoice: 'auto',
      stopWhen: [stepCountIs(15), hasToolCall('finish_report')],
      abortSignal,
      onStepFinish: (step) => {
        for (const tc of (step.toolCalls as Array<{ toolName: string }> | undefined) ?? []) {
          if (tc.toolName !== 'finish_report') {
            onProgress(`Strumento: ${tc.toolName}`);
          }
        }
      },
    });

    messages = [...messages, ...(result.response.messages as ModelMessage[])];

    if (capturedBlocks) break;

    // Context compression
    if (contextWindow > 0 && estimateTokens(messages) > contextWindow * 0.75) {
      onProgress('Compressione contesto in corso...');
      const summary = await compressContext(messages, plan, config, abortSignal);
      plan = plan ? `${plan}\n\n[Fase ${phase + 1}]\n${summary}` : summary;
      messages = [{ role: 'user', content: originalPrompt }];
      onProgress('Contesto compresso, riprendo analisi...');
    }
  }

  // Fallback: if finish_report was never called but the model produced text
  if (!capturedBlocks || (capturedBlocks as ReportBlock[]).length === 0) {
    const lastMessages = messages.filter(m => m.role === 'assistant');
    const text = lastMessages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap(m => Array.isArray(m.content) ? (m.content as any[]).filter(c => c.type === 'text').map((c: { text: string }) => c.text) : [String(m.content)])
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (text) {
      capturedBlocks = [{ type: 'text', content: text }];
      for (const [, table] of workspace) {
        capturedBlocks.push({ type: 'table', title: table.title, columns: table.columns, rows: table.rows });
      }
    } else {
      throw new Error("L'AI non ha prodotto un report. Prova a riformulare il prompt.");
    }
  }

  const report: Report = {
    id: crypto.randomUUID(),
    projectId,
    createdAt: Date.now(),
    prompt,
    blocks: capturedBlocks as ReportBlock[],
  };

  return { report, messages };
}
