import { generateText, stepCountIs, hasToolCall } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { tauriFetch } from './ai-fetch';
import type { AiConfig } from './ai-config';
import type { Fattura } from './parser';
import type { Report, ReportBlock } from './ai-reports';

// ── Schemas ───────────────────────────────────────────────────────────────────

const textBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
});

const tableBlockSchema = z.object({
  type: z.literal('table'),
  title: z.string().optional(),
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.string(), z.string())),
});

const reportBlocksSchema = z.array(z.union([textBlockSchema, tableBlockSchema]));

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
    f.cedentePiva ||
    f.cedenteCodFiscale ||
    '—';
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
  // Snapshot to plain JSON to strip Svelte 5 reactive proxies — the AI SDK
  // uses structuredClone internally on tool results and chokes on Proxy objects.
  const plainFatture = JSON.parse(JSON.stringify(fatture)) as Fattura[];

  // Backfill lineeDettaglio for fatture loaded from projects saved before that
  // field existed (rawXml is always persisted so we can re-parse on demand).
  for (const f of plainFatture) {
    if ((!f.lineeDettaglio || f.lineeDettaglio.length === 0) && f.rawXml) {
      f.lineeDettaglio = extractLineeFromXml(f.rawXml);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `Sei un assistente che analizza fatture elettroniche italiane.
Data odierna: ${today}
Fatture caricate: ${plainFatture.length}

Strumenti disponibili e quando usarli:
- aggregate_products → analisi su prodotti, quantità, fornitori (PREFERIRE questo, restituisce dati già aggregati in un'unica chiamata)
- list_fatture → elenco fatture con totali, senza linee prodotto
- get_fattura_details → dettaglio di UNA singola fattura
- get_all_line_items → righe grezze paginate (solo se aggregate_products non basta)
- run_subtask → estrazione avanzata da una singola fattura
- finish_report → OBBLIGATORIO per consegnare il report finale

Istruzioni:
1. Scegli lo strumento più efficiente. Per prodotti/quantità usa aggregate_products.
2. Elabora e aggrega i dati ricevuti: non chiamare altri strumenti per semplici calcoli.
3. Chiama finish_report con il report completo. Usa blocchi "text" (con testo markdown formattato) e blocchi "table" per le tabelle dati.
4. Rispondi sempre in italiano. NON usare markdown nei blocchi "text" per titoli h1/h2 — usa testo normale con grassetto per i titoli.`;

  // Captured when the model calls finish_report
  let capturedBlocks: ReportBlock[] | null = null;

  const tools = {
    list_fatture: {
      description: 'Restituisce una lista condensata delle fatture (senza linee di dettaglio). Usa get_all_line_items se hai bisogno dei prodotti.',
      inputSchema: z.object({
        cedente: z.string().optional().describe('Filtra per nome/p.iva cedente (ricerca parziale)'),
        cessionario: z.string().optional().describe('Filtra per nome/p.iva cessionario (ricerca parziale)'),
        tipoDocumento: z.string().optional().describe('Filtra per tipo documento (es. TD01)'),
        dataFrom: z.string().optional().describe('Data inizio YYYY-MM-DD'),
        dataTo: z.string().optional().describe('Data fine YYYY-MM-DD'),
      }),
      execute: async (args: {
        cedente?: string;
        cessionario?: string;
        tipoDocumento?: string;
        dataFrom?: string;
        dataTo?: string;
      }) => {
        let list = plainFatture.map(fatturaToCondensed);
        if (args.cedente) {
          const q = args.cedente.toLowerCase();
          list = list.filter(f => String(f.cedente ?? '').toLowerCase().includes(q));
        }
        if (args.cessionario) {
          const q = args.cessionario.toLowerCase();
          list = list.filter(f => String(f.cessionario ?? '').toLowerCase().includes(q));
        }
        if (args.tipoDocumento) list = list.filter(f => f.tipoDocumento === args.tipoDocumento);
        if (args.dataFrom) list = list.filter(f => f.data >= args.dataFrom!);
        if (args.dataTo) list = list.filter(f => f.data <= args.dataTo!);
        const total = list.length;
        const MAX = 100;
        const truncated = list.length > MAX;
        if (truncated) list = list.slice(0, MAX);
        onProgress(`list_fatture → ${total} risultati${truncated ? ` (prime ${MAX})` : ''}`);
        return { total, shown: list.length, truncated, items: list };
      },
    },

    aggregate_products: {
      description: 'Aggrega TUTTE le linee di dettaglio di TUTTE le fatture in un\'unica chiamata. Restituisce ogni prodotto unico con quantità totale, suddivisione per fornitore e numero di occorrenze. Molto più efficiente di get_all_line_items per analisi su grandi volumi.',
      inputSchema: z.object({
        search: z.string().optional().describe('Filtra per descrizione prodotto (parziale, case-insensitive)'),
        cedente: z.string().optional().describe('Filtra per fornitore (parziale)'),
        unitaMisura: z.string().optional().describe('Filtra per unità di misura (es. KG, LT, PZ)'),
        minQty: z.number().optional().describe('Mostra solo prodotti con quantità totale ≥ questo valore'),
        sortBy: z.enum(['qty', 'name', 'occurrences']).optional().default('qty').describe('Ordina per quantità (qty), nome (name) o occorrenze (occurrences)'),
      }),
      execute: async (args: {
        search?: string;
        cedente?: string;
        unitaMisura?: string;
        minQty?: number;
        sortBy?: 'qty' | 'name' | 'occurrences';
      }) => {
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
            // Key = product + unit so same product in different units stays separate
            const key = `${l.descrizione.trim()}|||${unit}`;
            const entry = map.get(key) ?? { unit, totalQty: 0, bySupplier: {}, count: 0 };
            entry.totalQty += l.quantita ?? 0;
            entry.count++;
            entry.bySupplier[fornitore] = (entry.bySupplier[fornitore] ?? 0) + (l.quantita ?? 0);
            map.set(key, entry);
          }
        }

        let results = Array.from(map.entries()).map(([key, e]) => {
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

        onProgress(`aggregate_products → ${results.length} prodotti unici da ${plainFatture.length} fatture`);
        return { totalProducts: results.length, products: results };
      },
    },

    get_all_line_items: {
      description: 'Restituisce TUTTE le righe di dettaglio di TUTTE le fatture: fornitore, data, descrizione prodotto, quantità, unità, prezzo unitario, importo totale riga. Ideale per analisi su prodotti e quantità. I risultati sono paginati (500 per pagina).',
      inputSchema: z.object({
        page: z.number().int().min(1).optional().default(1).describe('Pagina (default 1, 500 righe per pagina)'),
        cedente: z.string().optional().describe('Filtra per nome fornitore (ricerca parziale)'),
        search: z.string().optional().describe('Cerca nella descrizione prodotto (ricerca parziale)'),
      }),
      execute: async (args: { page?: number; cedente?: string; search?: string }) => {
        const PAGE_SIZE = 500;
        const page = args.page ?? 1;

        type LineItem = {
          fileName: string;
          data: string;
          cedente: string;
          descrizione: string;
          quantita: string;
          unitaMisura: string;
          prezzoUnitario: string;
          importo: string;
        };

        let items: LineItem[] = [];
        for (const f of plainFatture) {
          const fornitore = cedenteLabel(f);
          if (args.cedente) {
            if (!fornitore.toLowerCase().includes(args.cedente.toLowerCase())) continue;
          }
          const linee = f.lineeDettaglio ?? [];
          for (const l of linee) {
            if (!l.descrizione) continue;
            if (args.search && !l.descrizione.toLowerCase().includes(args.search.toLowerCase())) continue;
            items.push({
              fileName: f.fileName,
              data: f.data,
              cedente: fornitore,
              descrizione: l.descrizione.slice(0, 120),
              quantita: l.quantita != null ? String(l.quantita) : '',
              unitaMisura: l.unitaMisura ?? '',
              prezzoUnitario: l.prezzoUnitario != null ? String(l.prezzoUnitario) : '',
              importo: l.importo != null ? String(l.importo) : '',
            });
          }
        }

        const total = items.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const start = (page - 1) * PAGE_SIZE;
        const pageItems = items.slice(start, start + PAGE_SIZE);

        onProgress(`get_all_line_items → ${total} righe (pag. ${page}/${totalPages})`);
        return { total, page, totalPages, pageSize: PAGE_SIZE, items: pageItems };
      },
    },

    get_fattura_details: {
      description: 'Restituisce tutti i campi di una singola fattura, incluse le linee di dettaglio. Usa get_all_line_items per analisi su molte fatture.',
      inputSchema: z.object({
        fileName: z.string().describe('Nome file della fattura (da list_fatture)'),
      }),
      execute: async ({ fileName }: { fileName: string }) => {
        const f = plainFatture.find(x => x.fileName === fileName);
        if (!f) return { error: `Fattura non trovata: ${fileName}` };
        onProgress(`get_fattura_details → ${fileName}`);
        return fatturaToDetails(f);
      },
    },

    run_subtask: {
      description: 'Esegue un sotto-task isolato su una singola fattura per estrarre dati specifici.',
      inputSchema: z.object({
        fileName: z.string().describe('Nome file della fattura'),
        task: z.string().describe('Descrizione dettagliata del task di estrazione'),
      }),
      execute: async ({ fileName, task }: { fileName: string; task: string }) => {
        const f = plainFatture.find(x => x.fileName === fileName);
        if (!f) return { found: false, summary: `Fattura non trovata: ${fileName}`, extractions: [] };

        onProgress(`run_subtask → ${fileName}`);
        const details = fatturaToDetails(f);
        const subModel = buildModel(config);

        try {
          const result = await generateText({
            model: subModel,
            system: `Sei un estrattore di dati da fatture italiane. Rispondi SOLO con JSON valido in questo formato:
{"found": true, "summary": "...", "extractions": [{"key": "...", "value": "...", "unit": "..."}]}`,
            prompt: `Fattura: ${JSON.stringify(details)}\n\nTask: ${task}`,
          });
          return JSON.parse(result.text);
        } catch {
          return { found: false, summary: 'Estrazione fallita', extractions: [] };
        }
      },
    },

    finish_report: {
      description: 'Chiama questo strumento per produrre il report finale strutturato. DEVI chiamarlo obbligatoriamente al termine dell\'analisi.',
      inputSchema: z.object({
        blocks: reportBlocksSchema.describe('Blocchi del report: testo e/o tabelle'),
      }),
      execute: async ({ blocks }: { blocks: ReportBlock[] }) => {
        capturedBlocks = blocks;
        onProgress('Report prodotto');
        return 'Report completato con successo.';
      },
    },
  };

  await generateText({
    model,
    system: systemPrompt,
    prompt,
    tools,
    stopWhen: [stepCountIs(50), hasToolCall('finish_report')],
    onStepFinish: (step) => {
      for (const tc of (step.toolCalls as Array<{ toolName: string }> | undefined) ?? []) {
        if (tc.toolName !== 'finish_report') {
          onProgress(`Strumento: ${tc.toolName}`);
        }
      }
    },
  });

  if (!capturedBlocks || (capturedBlocks as ReportBlock[]).length === 0) {
    throw new Error("L'AI non ha prodotto un report. Riprova con un prompt più specifico.");
  }

  return {
    id: crypto.randomUUID(),
    projectId,
    createdAt: Date.now(),
    prompt,
    blocks: capturedBlocks,
  };
}
