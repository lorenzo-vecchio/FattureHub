import { generateText, stepCountIs, hasToolCall } from 'ai';
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

// finish_report accepts real table data OR a reference to a workspace table
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
function buildModel(config: AiConfig): any {
  if (config.provider === 'anthropic') {
    const provider = createAnthropic({
      apiKey: config.apiKey,
      ...(config.endpoint ? { baseURL: config.endpoint } : {}),
      fetch: tauriFetch as typeof fetch,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (provider as any)(config.model);
  }
  const provider = createOpenAI({
    apiKey: config.apiKey,
    ...(config.endpoint ? { baseURL: config.endpoint } : {}),
    fetch: tauriFetch as typeof fetch,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (provider as any).chat(config.model);
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

// ── Types ─────────────────────────────────────────────────────────────────────

type AggregateProduct = {
  descrizione: string;
  unitaMisura: string | null;
  quantitaTotale: number;
  occorrenze: number;
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
}): Promise<Report> {
  const { prompt, fatture, config, projectId, onProgress } = opts;

  const model = buildModel(config);
  // Snapshot: strip Svelte 5 reactive proxies (AI SDK uses structuredClone internally)
  const plainFatture = JSON.parse(JSON.stringify(fatture)) as Fattura[];

  // Backfill lineeDettaglio for fatture saved before that field existed
  for (const f of plainFatture) {
    if ((!f.lineeDettaglio || f.lineeDettaglio.length === 0) && f.rawXml) {
      f.lineeDettaglio = extractLineeFromXml(f.rawXml);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  // ── Workspace: named in-memory tables the AI builds incrementally ──────────
  // Tables are stored HERE (not in tool call arguments) so the LLM never has
  // to reproduce large row arrays — it just references tables by ID.
  const workspace = new Map<string, WorkspaceTable>();
  let lastAggregateResult: AggregateProduct[] | null = null;

  // ── Captured report blocks ────────────────────────────────────────────────
  let capturedBlocks: ReportBlock[] | null = null;

  const systemPrompt = `Sei un assistente che analizza fatture elettroniche italiane.
Data odierna: ${today} — Fatture caricate: ${plainFatture.length}

== WORKFLOW CONSIGLIATO ==
1. Raccogli i dati con aggregate_products (o altri strumenti di lettura).
2. Crea tabelle nel workspace con workspace_from_aggregate o workspace_add_rows.
   Le tabelle vengono salvate in memoria: non devi riprodurre i dati in finish_report.
3. Opzionalmente usa workspace_compute per calcolare statistiche.
4. Chiama finish_report con blocchi "text" (markdown) e "table_ref" (riferimento a tabella workspace).
   IMPORTANTE: usa "table_ref" invece di riprodurre le righe — finish_report deve essere PICCOLO.

== STRUMENTI ==
- aggregate_products  → aggrega prodotti/quantità su tutte le fatture (una chiamata)
- workspace_from_aggregate → crea tabella workspace dal risultato di aggregate_products
- workspace_add_rows  → aggiunge righe manuali a una tabella workspace
- workspace_compute   → somma/media/min/max su una colonna di una tabella workspace
- list_fatture        → elenco fatture (senza linee prodotto)
- get_fattura_details → dettagli di UNA fattura
- get_all_line_items  → righe grezze paginate (solo se aggregate_products non basta)
- finish_report       → OBBLIGATORIO — consegna il report finale

Rispondi sempre in italiano.`;

  const tools = {
    aggregate_products: {
      description: 'Aggrega tutte le righe di dettaglio in un\'unica chiamata: prodotti unici con quantità totale e suddivisione per fornitore. Risultati memorizzati internamente — usa workspace_from_aggregate per creare la tabella.',
      inputSchema: z.object({
        search: z.string().optional().describe('Filtra descrizione prodotto (parziale)'),
        cedente: z.string().optional().describe('Filtra fornitore (parziale)'),
        unitaMisura: z.string().optional().describe('Filtra unità di misura (es. KG, LT)'),
        minQty: z.number().optional().describe('Solo prodotti con quantità totale ≥ valore'),
        sortBy: z.enum(['qty', 'name', 'occurrences']).optional().default('qty'),
      }),
      execute: async (args: { search?: string; cedente?: string; unitaMisura?: string; minQty?: number; sortBy?: 'qty' | 'name' | 'occurrences' }) => {
        type Entry = { unit: string; totalQty: number; bySupplier: Record<string, number>; count: number };
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
            const entry = map.get(key) ?? { unit, totalQty: 0, bySupplier: {}, count: 0 };
            entry.totalQty += l.quantita ?? 0;
            entry.count++;
            entry.bySupplier[fornitore] = (entry.bySupplier[fornitore] ?? 0) + (l.quantita ?? 0);
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

        // Store full result in memory — not in the message history
        lastAggregateResult = results;

        onProgress(`aggregate_products → ${results.length} prodotti unici da ${plainFatture.length} fatture`);

        // Return only summary to avoid filling context window
        return {
          totalProducts: results.length,
          totalLines: Array.from(map.values()).reduce((s, e) => s + e.count, 0),
          topProducts: results.slice(0, 10).map(p => ({
            descrizione: p.descrizione,
            unitaMisura: p.unitaMisura,
            quantitaTotale: p.quantitaTotale,
            occorrenze: p.occorrenze,
          })),
          message: `Dati completi (${results.length} prodotti) salvati in memoria. Usa workspace_from_aggregate per creare tabelle senza riprodurre i dati.`,
        };
      },
    },

    workspace_from_aggregate: {
      description: 'Crea una tabella workspace dal risultato dell\'ultima chiamata a aggregate_products. La tabella viene salvata in memoria — referenziala in finish_report con { type: "table_ref", tableId }.',
      inputSchema: z.object({
        tableId: z.string().describe('Identificatore univoco della tabella (es. "prodotti")'),
        title: z.string().describe('Titolo della tabella'),
        mode: z.enum(['by_product', 'by_product_supplier']).optional().default('by_product').describe(
          'by_product: una riga per prodotto con quantità totale. by_product_supplier: una riga per combinazione prodotto+fornitore'
        ),
        search: z.string().optional().describe('Filtra ulteriormente per descrizione prodotto'),
        minQty: z.number().optional().describe('Includi solo prodotti con quantità totale ≥ valore'),
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
          rows = source.map(p => ({
            prodotto: p.descrizione,
            unitaMisura: p.unitaMisura ?? '',
            quantitaTotale: String(p.quantitaTotale),
            occorrenze: String(p.occorrenze),
          }));
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
      description: 'Aggiunge righe manuali a una tabella workspace. Crea la tabella se non esiste. Utile per accumulare dati da subtask o da analisi personalizzate.',
      inputSchema: z.object({
        tableId: z.string(),
        title: z.string().optional().describe('Titolo (solo alla prima creazione)'),
        columns: z.array(z.object({ key: z.string(), label: z.string() })).optional().describe('Colonne (solo alla prima creazione)'),
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
        return {
          tableId: args.tableId,
          totalRows: table.rows.length,
          added: args.rows.length,
        };
      },
    },

    workspace_compute: {
      description: 'Calcola una statistica su una colonna numerica di una tabella workspace.',
      inputSchema: z.object({
        tableId: z.string(),
        columnKey: z.string(),
        operation: z.enum(['sum', 'count', 'avg', 'min', 'max', 'unique_count']),
        label: z.string().optional().describe('Etichetta descrittiva del risultato'),
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

    run_subtask: {
      description: 'Estrazione avanzata da una singola fattura via LLM. Può usare workspace_add_rows per salvare i risultati.',
      inputSchema: z.object({
        fileName: z.string(),
        task: z.string(),
      }),
      execute: async ({ fileName, task }: { fileName: string; task: string }) => {
        const f = plainFatture.find(x => x.fileName === fileName);
        if (!f) return { found: false, summary: `Fattura non trovata: ${fileName}`, extractions: [] };
        onProgress(`run_subtask → ${fileName}`);
        const subModel = buildModel(config);
        try {
          const result = await generateText({
            model: subModel,
            system: `Sei un estrattore di dati da fatture italiane. Rispondi SOLO con JSON valido:
{"found": true, "summary": "...", "extractions": [{"key": "...", "value": "...", "unit": "..."}]}`,
            prompt: `Fattura: ${JSON.stringify(fatturaToDetails(f))}\n\nTask: ${task}`,
          });
          return JSON.parse(result.text);
        } catch {
          return { found: false, summary: 'Estrazione fallita', extractions: [] };
        }
      },
    },

    finish_report: {
      description: 'Consegna il report finale. Usa "table_ref" per referenziare tabelle workspace — NON riprodurre i dati. Esempio: { "type": "table_ref", "tableId": "prodotti" }',
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

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt,
    tools,
    toolChoice: 'required',
    stopWhen: [stepCountIs(50), hasToolCall('finish_report')],
    onStepFinish: (step) => {
      for (const tc of (step.toolCalls as Array<{ toolName: string }> | undefined) ?? []) {
        if (tc.toolName !== 'finish_report') {
          onProgress(`Strumento: ${tc.toolName}`);
        }
      }
    },
  });

  // Fallback: if finish_report was never called but the model produced text, wrap it
  if (!capturedBlocks || (capturedBlocks as ReportBlock[]).length === 0) {
    const text = result.steps
      .map(s => s.text)
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (text) {
      capturedBlocks = [{ type: 'text', content: text }];
      // Also attach any workspace tables that were built
      for (const [tableId, table] of workspace) {
        capturedBlocks.push({ type: 'table', title: table.title, columns: table.columns, rows: table.rows });
      }
    } else {
      throw new Error("L'AI non ha prodotto un report. Prova a riformulare il prompt.");
    }
  }

  return {
    id: crypto.randomUUID(),
    projectId,
    createdAt: Date.now(),
    prompt,
    blocks: capturedBlocks as ReportBlock[],
  };
}
