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

    const descrizioni = Array.from(body?.querySelectorAll('DettaglioLinee') ?? [])
      .map(l => getText(l, 'Descrizione'))
      .filter(Boolean);

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