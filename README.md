# Filtra Fatture Elettroniche

Applicazione desktop per filtrare, visualizzare ed esportare fatture elettroniche in formato **FatturaPA** (standard SDI italiano).

---

## Funzionalità

- **Carica** file XML o archivi ZIP tramite drag-and-drop (file singoli, cartelle, ZIP) o selezione manuale
- **Filtra** per: fornitore, cliente, data, importo, tipo documento, regime fiscale, formato trasmissione, testo libero
  - I filtri per fornitore e cliente sono **checkbox dinamiche** basate sui valori effettivamente presenti
- **Visualizza i dettagli** di ogni fattura: cedente, cessionario, importi, righe, dati SDI
- **Esporta** le fatture filtrate come ZIP — flat o raggruppate per fornitore / per cliente
- **Scarica** il singolo XML originale dal dialog di dettaglio
- **Salva progetti** su disco: salva la sessione corrente (fatture + filtri) e riaprila in seguito
- **Gestione progetti**: lista dei progetti salvati con anteprima, apertura e cancellazione
- **Tema chiaro/scuro/sistema** configurabile dalle impostazioni

Nessun dato viene inviato a server esterni. Tutto elaborato localmente.

---

## Stack

- [Tauri v2](https://tauri.app/) — shell desktop nativa (macOS, Windows, Linux)
- [SvelteKit](https://kit.svelte.dev/) + TypeScript
- [shadcn-svelte](https://www.shadcn-svelte.com/) + [Tailwind CSS v4](https://tailwindcss.com/)
- [JSZip](https://stuk.github.io/jszip/) per la gestione degli archivi
- Parsing XML via `DOMParser`

---

## Avvio (sviluppo)

```bash
npm install
npm run tauri:dev
```

## Build

```bash
npm run tauri:build
```

Produce un bundle nativo per la piattaforma corrente (`.dmg` su macOS, `.msi`/`.exe` su Windows, `.AppImage`/`.deb` su Linux).

---

## Formati supportati

| Formato                                     | Supporto                 |
| ------------------------------------------- | ------------------------ |
| `.xml` FatturaPA ordinaria (FPR12)          | ✓                        |
| `.xml` FatturaPA PA (FPA12)                 | ✓                        |
| `.zip` contenente XML                       | ✓                        |
| Cartella trascinata (ricorsiva)             | ✓                        |
| File metadati macOS (`._*`, `__MACOSX`)     | ignorati automaticamente |

---

## Limitazioni note

- Il parser legge solo il **primo body** per fattura (fatture multi-body parzialmente supportate per i totali)
- Nessuna validazione della firma digitale
- Interfaccia solo in italiano

---

## Autore

Lorenzo Giovanni Vecchio
