import type { Fattura } from './parser';

export interface Filters {
  // Data
  dataFrom: string;
  dataTo: string;
  // Fornitore
  fornitore: string;
  pivaFornitore: string;
  // Cliente
  cliente: string;
  // Importo
  importoMin: string;
  importoMax: string;
  // Tipo documento
  tipoDocumento: string[];
  // Regime fiscale
  regimeFiscale: string;
  // Numero fattura
  numero: string;
  // Formato trasmissione
  formatoTrasmissione: string;
  // Testo libero (cerca in descrizioni e causale)
  testoLibero: string;
}

export const TIPI_DOCUMENTO = [
  { value: 'TD01', label: 'TD01 – Fattura' },
  { value: 'TD02', label: 'TD02 – Acconto/anticipo su fattura' },
  { value: 'TD03', label: 'TD03 – Acconto/anticipo su parcella' },
  { value: 'TD04', label: 'TD04 – Nota di credito' },
  { value: 'TD05', label: 'TD05 – Nota di debito' },
  { value: 'TD06', label: 'TD06 – Parcella' },
  { value: 'TD16', label: 'TD16 – Integrazione reverse charge' },
  { value: 'TD17', label: 'TD17 – Integrazione/autofattura servizi esteri' },
  { value: 'TD18', label: 'TD18 – Integrazione beni art. 42' },
  { value: 'TD19', label: 'TD19 – Integrazione beni art. 17' },
  { value: 'TD20', label: 'TD20 – Autofattura denuncia' },
  { value: 'TD21', label: 'TD21 – Autofattura semplificata' },
  { value: 'TD22', label: 'TD22 – Estrazione beni deposito IVA' },
  { value: 'TD23', label: 'TD23 – Estrazione beni con pagamento IVA' },
  { value: 'TD24', label: 'TD24 – Fattura differita art. 21' },
  { value: 'TD25', label: 'TD25 – Fattura differita art. 21 c.4' },
  { value: 'TD26', label: 'TD26 – Cessione beni ammortizzabili' },
  { value: 'TD27', label: 'TD27 – Autofattura per autoconsumo' },
  { value: 'TD28', label: 'TD28 – Acquisto da San Marino con IVA' },
];

export const REGIMI_FISCALI = [
  { value: 'RF01', label: 'RF01 – Ordinario' },
  { value: 'RF02', label: 'RF02 – Contribuenti minimi' },
  { value: 'RF04', label: 'RF04 – Agricoltura' },
  { value: 'RF05', label: 'RF05 – Vendita sali e tabacchi' },
  { value: 'RF10', label: 'RF10 – Commercio fiammiferi' },
  { value: 'RF11', label: 'RF11 – Editoria' },
  { value: 'RF12', label: 'RF12 – Gestione servizi telefonia pubblica' },
  { value: 'RF13', label: 'RF13 – Rivendita documenti sosta' },
  { value: 'RF14', label: 'RF14 – Intrattenimenti/giochi' },
  { value: 'RF15', label: 'RF15 – Agenzie viaggi' },
  { value: 'RF16', label: 'RF16 – Agricoltura e attività connesse' },
  { value: 'RF17', label: 'RF17 – Pesca' },
  { value: 'RF18', label: 'RF18 – Provvidenze letteratura' },
  { value: 'RF19', label: 'RF19 – Regime forfettario' },
];

export function emptyFilters(): Filters {
  return {
    dataFrom: '', dataTo: '', fornitore: '', pivaFornitore: '',
    cliente: '', importoMin: '', importoMax: '', tipoDocumento: [],
    regimeFiscale: '', numero: '', formatoTrasmissione: '', testoLibero: '',
  };
}

export function applyFilters(fatture: Fattura[], f: Filters): Fattura[] {
  return fatture.filter(fat => {
    if (f.dataFrom && fat.data < f.dataFrom) return false;
    if (f.dataTo && fat.data > f.dataTo) return false;

    if (f.fornitore) {
      const label = (fat.cedenteDenominazione + fat.cedenteNome + fat.cedenteCognome).toLowerCase();
      if (!label.includes(f.fornitore.toLowerCase())) return false;
    }
    if (f.pivaFornitore && !fat.cedentePiva.includes(f.pivaFornitore)) return false;
    if (f.cliente) {
      const label = fat.cessionarioDenominazione.toLowerCase();
      if (!label.includes(f.cliente.toLowerCase())) return false;
    }

    if (f.importoMin && fat.importoTotale < parseFloat(f.importoMin)) return false;
    if (f.importoMax && fat.importoTotale > parseFloat(f.importoMax)) return false;

    if (f.tipoDocumento.length > 0 && !f.tipoDocumento.includes(fat.tipoDocumento)) return false;

    if (f.regimeFiscale && fat.cedenteRegimeFiscale !== f.regimeFiscale) return false;
    if (f.numero && !fat.numero.toLowerCase().includes(f.numero.toLowerCase())) return false;
    if (f.formatoTrasmissione && fat.formatoTrasmissione !== f.formatoTrasmissione) return false;

    if (f.testoLibero) {
      const haystack = [...fat.descrizioni, fat.causale].join(' ').toLowerCase();
      if (!haystack.includes(f.testoLibero.toLowerCase())) return false;
    }

    return true;
  });
}

export function countActiveFilters(f: Filters): number {
  return Object.entries(f).filter(([k, v]) =>
    Array.isArray(v) ? v.length > 0 : v !== ''
  ).length;
}