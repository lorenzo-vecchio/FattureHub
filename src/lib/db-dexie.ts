import Dexie, { type EntityTable } from 'dexie'
import type { Fattura, DettaglioLinea } from './parser'

export interface Invoice {
  id: string
  fileName: string
  rawXml: string
  progressivoInvio: string
  formatoTrasmissione: string
  codiceDestinatario: string
  pecDestinatario: string
  cedenteDenominazione: string
  cedenteNome: string
  cedenteCognome: string
  cedentePiva: string
  cedenteCodFiscale: string
  cedenteRegimeFiscale: string
  cessionarioDenominazione: string
  cessionarioPiva: string
  cessionarioCodFiscale: string
  tipoDocumento: string
  numero: string
  data: string
  importoTotale: number
  imponibile: number
  imposta: number
  valuta: string
  causale: string
  importedAt: Date
  compressedFilePath?: string
}

export interface InvoiceLine {
  id: string
  invoiceId: string
  sequence: number
  descrizione: string
  quantita?: number
  unitaMisura?: string
  prezzoUnitario?: number
  importo?: number
}

export interface Setting {
  key: string
  value: string
  updatedAt: Date
}

class FattureDatabase extends Dexie {
  invoices!: EntityTable<Invoice, 'id'>
  invoiceLines!: EntityTable<InvoiceLine, 'id'>
  settings!: EntityTable<Setting, 'key'>
  
  constructor() {
    super('FattureDatabase')
    
    this.version(1).stores({
      invoices: 'id, fileName, cedentePiva, cessionarioPiva, data, importedAt',
      invoiceLines: 'id, invoiceId, sequence, [invoiceId+sequence]',
      settings: 'key',
    })
    
    // Add indexes for better query performance
    this.version(2).stores({
      invoices: 'id, fileName, cedentePiva, cessionarioPiva, data, importedAt, [cedentePiva+data]',
      invoiceLines: 'id, invoiceId, sequence, descrizione, [invoiceId+sequence]',
      settings: 'key',
    }).upgrade((tx) => {
      // Migration logic if needed
      return Promise.resolve()
    })
  }
}

export const db = new FattureDatabase()

// Helper functions
export async function saveInvoice(fattura: Fattura, compressedFilePath?: string): Promise<string> {
  const invoiceId = crypto.randomUUID()
  
  await db.transaction('rw', db.invoices, db.invoiceLines, async () => {
    // Save invoice
    await db.invoices.add({
      id: invoiceId,
      fileName: fattura.fileName,
      rawXml: fattura.rawXml,
      progressivoInvio: fattura.progressivoInvio,
      formatoTrasmissione: fattura.formatoTrasmissione,
      codiceDestinatario: fattura.codiceDestinatario,
      pecDestinatario: fattura.pecDestinatario,
      cedenteDenominazione: fattura.cedenteDenominazione,
      cedenteNome: fattura.cedenteNome,
      cedenteCognome: fattura.cedenteCognome,
      cedentePiva: fattura.cedentePiva,
      cedenteCodFiscale: fattura.cedenteCodFiscale,
      cedenteRegimeFiscale: fattura.cedenteRegimeFiscale,
      cessionarioDenominazione: fattura.cessionarioDenominazione,
      cessionarioPiva: fattura.cessionarioPiva,
      cessionarioCodFiscale: fattura.cessionarioCodFiscale,
      tipoDocumento: fattura.tipoDocumento,
      numero: fattura.numero,
      data: fattura.data,
      importoTotale: fattura.importoTotale,
      imponibile: fattura.imponibile,
      imposta: fattura.imposta,
      valuta: fattura.valuta,
      causale: fattura.causale,
      importedAt: new Date(),
      compressedFilePath,
    })
    
    // Save invoice lines
    if (fattura.lineeDettaglio && fattura.lineeDettaglio.length > 0) {
      const lines: InvoiceLine[] = fattura.lineeDettaglio.map((line, index) => ({
        id: crypto.randomUUID(),
        invoiceId,
        sequence: index + 1,
        descrizione: line.descrizione,
        quantita: line.quantita,
        unitaMisura: line.unitaMisura,
        prezzoUnitario: line.prezzoUnitario,
        importo: line.importo,
      }))
      
      await db.invoiceLines.bulkAdd(lines)
    }
  })
  
  return invoiceId
}

export async function getAllInvoices(): Promise<Fattura[]> {
  const invoices = await db.invoices.toArray()
  const result: Fattura[] = []
  
  for (const invoice of invoices) {
    const lines = await db.invoiceLines
      .where('invoiceId')
      .equals(invoice.id)
      .sortBy('sequence')
    
    const lineeDettaglio: DettaglioLinea[] = lines.map(line => ({
      descrizione: line.descrizione,
      quantita: line.quantita,
      unitaMisura: line.unitaMisura,
      prezzoUnitario: line.prezzoUnitario,
      importo: line.importo,
    }))
    
    const descrizioni = lineeDettaglio.map(line => line.descrizione).filter(Boolean)
    
    result.push({
      fileName: invoice.fileName,
      rawXml: invoice.rawXml,
      progressivoInvio: invoice.progressivoInvio,
      formatoTrasmissione: invoice.formatoTrasmissione,
      codiceDestinatario: invoice.codiceDestinatario,
      pecDestinatario: invoice.pecDestinatario,
      cedenteDenominazione: invoice.cedenteDenominazione,
      cedenteNome: invoice.cedenteNome,
      cedenteCognome: invoice.cedenteCognome,
      cedentePiva: invoice.cedentePiva,
      cedenteCodFiscale: invoice.cedenteCodFiscale,
      cedenteRegimeFiscale: invoice.cedenteRegimeFiscale,
      cessionarioDenominazione: invoice.cessionarioDenominazione,
      cessionarioPiva: invoice.cessionarioPiva,
      cessionarioCodFiscale: invoice.cessionarioCodFiscale,
      tipoDocumento: invoice.tipoDocumento,
      numero: invoice.numero,
      data: invoice.data,
      importoTotale: invoice.importoTotale,
      imponibile: invoice.imponibile,
      imposta: invoice.imposta,
      valuta: invoice.valuta,
      causale: invoice.causale,
      descrizioni,
      lineeDettaglio,
    })
  }
  
  return result
}

export async function getSetting(key: string): Promise<string | null> {
  const setting = await db.settings.get(key)
  return setting?.value || null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({
    key,
    value,
    updatedAt: new Date(),
  })
}

export async function deleteInvoice(id: string): Promise<void> {
  await db.transaction('rw', db.invoices, db.invoiceLines, async () => {
    await db.invoiceLines.where('invoiceId').equals(id).delete()
    await db.invoices.delete(id)
  })
}

export async function clearAllInvoices(): Promise<void> {
  await db.transaction('rw', db.invoices, db.invoiceLines, async () => {
    await db.invoiceLines.clear()
    await db.invoices.clear()
  })
}

// Initialize default settings
export async function initializeDatabase(): Promise<void> {
  // Check if settings exist, create defaults if not
  const keepFilesSetting = await getSetting('keepFilesAfterImport')
  if (keepFilesSetting === null) {
    await setSetting('keepFilesAfterImport', 'false')
  }
  
  const compressionLevel = await getSetting('compressionLevel')
  if (compressionLevel === null) {
    await setSetting('compressionLevel', '6') // Default compression level
  }
}