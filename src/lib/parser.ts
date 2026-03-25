export interface Fattura {
  fileName: string;
  rawXml: string;
  // Header
  progressivoInvio: string;
  formatoTrasmissione: string; // FPR12 | FPA12
  codiceDestinatario: string;
  pecDestinatario: string;
  // Cedente (fornitore)
  cedenteDenominazione: string;
  cedenteNome: string;
  cedenteCognome: string;
  cedentePiva: string;
  cedenteCodFiscale: string;
  cedenteRegimeFiscale: string;
  // Cessionario (cliente)
  cessionarioDenominazione: string;
  cessionarioPiva: string;
  cessionarioCodFiscale: string;
  // Body (può esserci più di un body — prendiamo il primo)
  tipoDocumento: string; // TD01, TD04, ecc.
  numero: string;
  data: string; // YYYY-MM-DD
  importoTotale: number;
  imponibile: number;
  imposta: number;
  valuta: string;
  causale: string;
  // Linee
  descrizioni: string[];
  lineeDettaglio?: DettaglioLinea[];
}

export interface DettaglioLinea {
  descrizione: string;
  quantita?: number;
  unitaMisura?: string;
  prezzoUnitario?: number;
  importo?: number;
}

// ── .p7m extraction ───────────────────────────────────────────────────────────

/**
 * Italian FatturaPA .p7m files are CMS/PKCS#7 DER-encoded SignedData where the
 * original XML is stored as a CONSTRUCTED OCTET STRING split into 1000-byte
 * primitive chunks: 04 82 03e8 <1000 bytes> 04 82 03e8 <1000 bytes> …
 *
 * 0x04 (EOT) is not valid in XML, so every 0x04 byte in the content is
 * guaranteed to be a DER OCTET STRING tag. We strip tag+length, reassemble the
 * clean bytes, then decode as UTF-8.
 */
function reassembleDerContent(bytes: Uint8Array, start: number): Uint8Array {
  const chunks: Uint8Array[] = [];
  let i = start;
  let chunkStart = start;

  while (i < bytes.length) {
    // End-of-contents (00 00) terminates indefinite-length encoding
    if (bytes[i] === 0x00 && bytes[i + 1] === 0x00) {
      if (i > chunkStart) chunks.push(bytes.subarray(chunkStart, i));
      break;
    }
    // OCTET STRING primitive tag
    if (bytes[i] === 0x04 && i + 1 < bytes.length) {
      const lb = bytes[i + 1];
      const skip = lb < 0x80 ? 2 : lb === 0x81 ? 3 : lb === 0x82 ? 4 : lb === 0x83 ? 5 : 0;
      if (skip > 0) {
        if (i > chunkStart) chunks.push(bytes.subarray(chunkStart, i));
        i += skip;
        chunkStart = i;
        continue;
      }
    }
    i++;
  }
  if (chunkStart < i && i <= bytes.length) chunks.push(bytes.subarray(chunkStart, i));

  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

export function extractXmlFromP7m(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // Find <?xml — may be preceded by UTF-8 BOM (EF BB BF)
  const tag = [0x3C, 0x3F, 0x78, 0x6D, 0x6C]; // <?xml
  let xmlStart = -1;
  outer: for (let i = 0; i <= bytes.length - tag.length; i++) {
    for (let j = 0; j < tag.length; j++) if (bytes[i + j] !== tag[j]) continue outer;
    // Include BOM if immediately preceding
    xmlStart = i >= 3 && bytes[i - 3] === 0xEF && bytes[i - 2] === 0xBB && bytes[i - 1] === 0xBF
      ? i - 3 : i;
    break;
  }

  // Fallback: root element without XML declaration
  if (xmlStart === -1) {
    const root = new TextEncoder().encode('<FatturaElettronica');
    outer2: for (let i = 0; i <= bytes.length - root.length; i++) {
      for (let j = 0; j < root.length; j++) if (bytes[i + j] !== root[j]) continue outer2;
      xmlStart = i;
      break;
    }
  }

  if (xmlStart === -1) throw new Error('Contenuto XML non trovato nel file .p7m');

  // Strip DER OCTET STRING chunk headers and reassemble clean bytes
  const cleaned = reassembleDerContent(bytes, xmlStart);
  let xml = new TextDecoder('utf-8', { fatal: false }).decode(cleaned);

  // Strip UTF-8 BOM if decoded
  xml = xml.replace(/^\uFEFF/, '');

  // Trim at root closing tag
  const end = xml.match(/<\/[\w:]*FatturaElettronica>/);
  if (end?.index !== undefined) return xml.slice(0, end.index + end[0].length);

  const lastGt = xml.lastIndexOf('>');
  return lastGt !== -1 ? xml.slice(0, lastGt + 1) : xml;
}

function getText(el: Element | null | undefined, tag: string): string {
  if (!el) return '';
  return el.querySelector(tag)?.textContent?.trim() ?? '';
}

function getNum(el: Element | null | undefined, tag: string): number {
  const t = getText(el, tag);
  return t ? parseFloat(t.replace(',', '.')) : 0;
}

export function parseXml(fileName: string, xmlString: string): Fattura | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    if (doc.querySelector('parsererror')) return null;

    const header = doc.querySelector('FatturaElettronicaHeader');
    const body = doc.querySelector('FatturaElettronicaBody');

    const dt = header?.querySelector('DatiTrasmissione');
    const cedente = header?.querySelector('CedentePrestatore');
    const cessionario = header?.querySelector('CessionarioCommittente');
    const datiGen = body?.querySelector('DatiGeneraliDocumento');
    const datiRiepilogo = body?.querySelector('DatiRiepilogo');

    // Somma tutte le linee
    const imponibile = Array.from(body?.querySelectorAll('DatiRiepilogo') ?? [])
      .reduce((acc, r) => acc + getNum(r, 'ImponibileImporto'), 0);
    const imposta = Array.from(body?.querySelectorAll('DatiRiepilogo') ?? [])
      .reduce((acc, r) => acc + getNum(r, 'Imposta'), 0);

    const lineeEls = Array.from(body?.querySelectorAll('DettaglioLinee') ?? []);
    const descrizioni = lineeEls.map(l => getText(l, 'Descrizione')).filter(Boolean);
    const lineeDettaglio: DettaglioLinea[] = lineeEls.map(l => ({
      descrizione: getText(l, 'Descrizione'),
      quantita: getNum(l, 'Quantita') || undefined,
      unitaMisura: getText(l, 'UnitaMisura') || undefined,
      prezzoUnitario: getNum(l, 'PrezzoUnitario') || undefined,
      importo: getNum(l, 'PrezzoTotale') || undefined,
    }));

    return {
      fileName,
      rawXml: xmlString,
      progressivoInvio: getText(dt, 'ProgressivoInvio'),
      formatoTrasmissione: getText(dt, 'FormatoTrasmissione'),
      codiceDestinatario: getText(dt, 'CodiceDestinatario'),
      pecDestinatario: getText(dt, 'PECDestinatario'),
      cedenteDenominazione: getText(cedente, 'Denominazione'),
      cedenteNome: getText(cedente, 'Nome'),
      cedenteCognome: getText(cedente, 'Cognome'),
      cedentePiva: getText(cedente?.querySelector('IdFiscaleIVA'), 'IdCodice'),
      cedenteCodFiscale: getText(cedente, 'CodiceFiscale'),
      cedenteRegimeFiscale: getText(cedente, 'RegimeFiscale'),
      cessionarioDenominazione: getText(cessionario, 'Denominazione'),
      cessionarioPiva: getText(cessionario?.querySelector('IdFiscaleIVA'), 'IdCodice'),
      cessionarioCodFiscale: getText(cessionario, 'CodiceFiscale'),
      tipoDocumento: getText(datiGen, 'TipoDocumento'),
      numero: getText(datiGen, 'Numero'),
      data: getText(datiGen, 'Data'),
      importoTotale: getNum(datiGen, 'ImportoTotaleDocumento'),
      imponibile,
      imposta,
      valuta: getText(datiGen, 'Divisa') || 'EUR',
      causale: getText(datiGen, 'Causale'),
      descrizioni,
      lineeDettaglio,
    };
  } catch {
    return null;
  }
}

export function cedenteLabel(f: Fattura): string {
  return f.cedenteDenominazione ||
    [f.cedenteNome, f.cedenteCognome].filter(Boolean).join(' ') ||
    f.cedentePiva ||
    f.cedenteCodFiscale ||
    '—';
}

export function cedenteKey(f: Fattura): string {
  return f.cedentePiva || f.cedenteCodFiscale || cedenteLabel(f);
}

export function cessionarioLabel(f: Fattura): string {
  return f.cessionarioDenominazione || f.cessionarioPiva || f.cessionarioCodFiscale || '—';
}

export function cessionarioKey(f: Fattura): string {
  return f.cessionarioPiva || f.cessionarioCodFiscale || f.cessionarioDenominazione || '?';
}