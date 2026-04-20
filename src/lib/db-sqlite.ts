import Database from '@tauri-apps/plugin-sql'
import type { DettaglioLinea, Fattura } from './parser'

type DbRow = Record<string, unknown>

let dbPromise: Promise<Database> | null = null
let schemaPromise: Promise<void> | null = null

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load('sqlite:fatturehub.db')
  }
  return dbPromise
}

export async function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const db = await getDb()
      await db.execute('PRAGMA foreign_keys = ON')

      await db.execute(`
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          file_name TEXT NOT NULL,
          raw_xml TEXT NOT NULL,
          progressivo_invio TEXT NOT NULL,
          formato_trasmissione TEXT NOT NULL,
          codice_destinatario TEXT NOT NULL,
          pec_destinatario TEXT NOT NULL,
          cedente_denominazione TEXT NOT NULL,
          cedente_nome TEXT NOT NULL,
          cedente_cognome TEXT NOT NULL,
          cedente_piva TEXT NOT NULL,
          cedente_cod_fiscale TEXT NOT NULL,
          cedente_regime_fiscale TEXT NOT NULL,
          cessionario_denominazione TEXT NOT NULL,
          cessionario_piva TEXT NOT NULL,
          cessionario_cod_fiscale TEXT NOT NULL,
          tipo_documento TEXT NOT NULL,
          numero TEXT NOT NULL,
          data TEXT NOT NULL,
          importo_totale REAL NOT NULL,
          imponibile REAL NOT NULL,
          imposta REAL NOT NULL,
          valuta TEXT NOT NULL,
          causale TEXT NOT NULL,
          imported_at INTEGER NOT NULL,
          compressed_file_path TEXT
        )
      `)

      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id)'
      )
      await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_data ON invoices(data)')

      await db.execute(`
        CREATE TABLE IF NOT EXISTS invoice_lines (
          id TEXT PRIMARY KEY,
          invoice_id TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          descrizione TEXT NOT NULL,
          quantita REAL,
          unita_misura TEXT,
          prezzo_unitario REAL,
          importo REAL,
          FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        )
      `)
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id_sequence ON invoice_lines(invoice_id, sequence)'
      )

      await db.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `)

      await db.execute(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          saved_at INTEGER NOT NULL,
          last_opened_at INTEGER,
          filters_json TEXT NOT NULL
        )
      `)

      await db.execute(`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          prompt TEXT NOT NULL,
          blocks_json TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
      `)
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_reports_project_created ON reports(project_id, created_at DESC)'
      )
    })()
  }

  await schemaPromise
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function mapInvoiceRow(row: DbRow, lineeDettaglio: DettaglioLinea[]): Fattura {
  const descrizioni = lineeDettaglio.map((line) => line.descrizione).filter(Boolean)

  return {
    id: asString(row.id),
    fileName: asString(row.file_name),
    rawXml: asString(row.raw_xml),
    progressivoInvio: asString(row.progressivo_invio),
    formatoTrasmissione: asString(row.formato_trasmissione),
    codiceDestinatario: asString(row.codice_destinatario),
    pecDestinatario: asString(row.pec_destinatario),
    cedenteDenominazione: asString(row.cedente_denominazione),
    cedenteNome: asString(row.cedente_nome),
    cedenteCognome: asString(row.cedente_cognome),
    cedentePiva: asString(row.cedente_piva),
    cedenteCodFiscale: asString(row.cedente_cod_fiscale),
    cedenteRegimeFiscale: asString(row.cedente_regime_fiscale),
    cessionarioDenominazione: asString(row.cessionario_denominazione),
    cessionarioPiva: asString(row.cessionario_piva),
    cessionarioCodFiscale: asString(row.cessionario_cod_fiscale),
    tipoDocumento: asString(row.tipo_documento),
    numero: asString(row.numero),
    data: asString(row.data),
    importoTotale: asNumber(row.importo_totale),
    imponibile: asNumber(row.imponibile),
    imposta: asNumber(row.imposta),
    valuta: asString(row.valuta),
    causale: asString(row.causale),
    descrizioni,
    lineeDettaglio,
  }
}

async function insertInvoiceTx(
  db: Database,
  invoiceId: string,
  fattura: Fattura,
  compressedFilePath?: string,
  projectId: string | null = null
): Promise<void> {
  await db.execute(
    `
      INSERT INTO invoices (
        id, project_id, file_name, raw_xml, progressivo_invio, formato_trasmissione,
        codice_destinatario, pec_destinatario, cedente_denominazione, cedente_nome,
        cedente_cognome, cedente_piva, cedente_cod_fiscale, cedente_regime_fiscale,
        cessionario_denominazione, cessionario_piva, cessionario_cod_fiscale,
        tipo_documento, numero, data, importo_totale, imponibile, imposta,
        valuta, causale, imported_at, compressed_file_path
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27
      )
    `,
    [
      invoiceId,
      projectId,
      fattura.fileName,
      fattura.rawXml,
      fattura.progressivoInvio,
      fattura.formatoTrasmissione,
      fattura.codiceDestinatario,
      fattura.pecDestinatario,
      fattura.cedenteDenominazione,
      fattura.cedenteNome,
      fattura.cedenteCognome,
      fattura.cedentePiva,
      fattura.cedenteCodFiscale,
      fattura.cedenteRegimeFiscale,
      fattura.cessionarioDenominazione,
      fattura.cessionarioPiva,
      fattura.cessionarioCodFiscale,
      fattura.tipoDocumento,
      fattura.numero,
      fattura.data,
      fattura.importoTotale,
      fattura.imponibile,
      fattura.imposta,
      fattura.valuta,
      fattura.causale,
      Date.now(),
      compressedFilePath ?? null,
    ]
  )

  if (!fattura.lineeDettaglio || fattura.lineeDettaglio.length === 0) return

  const values: string[] = []
  const params: (string | number | null)[] = []
  let p = 1

  for (let i = 0; i < fattura.lineeDettaglio.length; i++) {
    const line = fattura.lineeDettaglio[i]
    values.push(`($${p}, $${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7})`)
    params.push(
      crypto.randomUUID(),
      invoiceId,
      i + 1,
      line.descrizione,
      line.quantita ?? null,
      line.unitaMisura ?? null,
      line.prezzoUnitario ?? null,
      line.importo ?? null
    )
    p += 8
  }

  await db.execute(
    `
      INSERT INTO invoice_lines (
        id, invoice_id, sequence, descrizione, quantita, unita_misura, prezzo_unitario, importo
      ) VALUES ${values.join(', ')}
    `,
    params
  )
}

export async function saveInvoice(
  fattura: Fattura,
  compressedFilePath?: string,
  projectId: string | null = null
): Promise<string> {
  await ensureSchema()
  const db = await getDb()
  const invoiceId = crypto.randomUUID()

  await db.execute('BEGIN')
  try {
    await insertInvoiceTx(db, invoiceId, fattura, compressedFilePath, projectId)

    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }

  return invoiceId
}

export async function saveInvoicesBatch(
  fatture: Fattura[],
  compressedFilePath?: string,
  projectId: string | null = null,
  chunkSize = 40,
  onProgress?: (savedCount: number, totalCount: number) => void
): Promise<string[]> {
  await ensureSchema()
  const db = await getDb()
  const ids: string[] = []
  const totalCount = fatture.length
  let savedCount = 0

  for (let i = 0; i < fatture.length; i += chunkSize) {
    const chunk = fatture.slice(i, i + chunkSize)

    await db.execute('BEGIN')
    try {
      for (const fattura of chunk) {
        const invoiceId = crypto.randomUUID()
        await insertInvoiceTx(db, invoiceId, fattura, compressedFilePath, projectId)
        ids.push(invoiceId)
        savedCount += 1
        onProgress?.(savedCount, totalCount)
      }
      await db.execute('COMMIT')
    } catch (error) {
      await db.execute('ROLLBACK')
      throw error
    }
  }

  return ids
}

export async function getAllInvoices(projectId: string | null = null): Promise<Fattura[]> {
  await ensureSchema()
  const db = await getDb()

  const invoices = (projectId === null
    ? await db.select<DbRow[]>('SELECT * FROM invoices WHERE project_id IS NULL ORDER BY imported_at DESC')
    : await db.select<DbRow[]>('SELECT * FROM invoices WHERE project_id = $1 ORDER BY imported_at DESC', [projectId])) as DbRow[]

  if (invoices.length === 0) return []

  const ids = invoices.map((row) => asString(row.id)).filter(Boolean)
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
  const lines = (await db.select<DbRow[]>(
    `
      SELECT invoice_id, sequence, descrizione, quantita, unita_misura, prezzo_unitario, importo
      FROM invoice_lines
      WHERE invoice_id IN (${placeholders})
      ORDER BY sequence ASC
    `,
    ids
  )) as DbRow[]

  const byInvoice = new Map<string, DettaglioLinea[]>()
  for (const line of lines) {
    const invoiceId = asString(line.invoice_id)
    if (!invoiceId) continue

    const list = byInvoice.get(invoiceId) ?? []
    list.push({
      descrizione: asString(line.descrizione),
      quantita: line.quantita === null ? undefined : asNumber(line.quantita),
      unitaMisura: line.unita_misura === null ? undefined : asString(line.unita_misura),
      prezzoUnitario: line.prezzo_unitario === null ? undefined : asNumber(line.prezzo_unitario),
      importo: line.importo === null ? undefined : asNumber(line.importo),
    })
    byInvoice.set(invoiceId, list)
  }

  return invoices.map((row) => mapInvoiceRow(row, byInvoice.get(asString(row.id)) ?? []))
}

export async function deleteInvoice(id: string): Promise<void> {
  await ensureSchema()
  const db = await getDb()
  await db.execute('DELETE FROM invoices WHERE id = $1', [id])
}

export async function clearAllInvoices(projectId: string | null = null): Promise<void> {
  await ensureSchema()
  const db = await getDb()

  if (projectId === null) {
    await db.execute('DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE project_id IS NULL)')
    await db.execute('DELETE FROM invoices WHERE project_id IS NULL')
    return
  }

  await db.execute('DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE project_id = $1)', [projectId])
  await db.execute('DELETE FROM invoices WHERE project_id = $1', [projectId])
}

export async function getSetting(key: string): Promise<string | null> {
  await ensureSchema()
  const db = await getDb()
  const rows = (await db.select<DbRow[]>('SELECT value FROM settings WHERE key = $1 LIMIT 1', [key])) as DbRow[]
  if (rows.length === 0) return null
  return asString(rows[0].value)
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureSchema()
  const db = await getDb()
  await db.execute(
    `
      INSERT INTO settings (key, value, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    [key, value, Date.now()]
  )
}

export async function initializeDatabase(): Promise<void> {
  await ensureSchema()

  const defaultSettings = [
    { key: 'keepFilesAfterImport', value: 'false' },
    { key: 'compressionLevel', value: '6' },
    {
      key: 'aiConfig',
      value: JSON.stringify({
        enabled: false,
        provider: 'openai',
        endpoint: '',
        apiKey: '',
        model: '',
        orchestratorModel: '',
        taskModel: '',
        contextWindow: 0,
      }),
    },
  ]

  for (const setting of defaultSettings) {
    const existing = await getSetting(setting.key)
    if (existing === null) {
      await setSetting(setting.key, setting.value)
    }
  }
}