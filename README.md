# FattureHub

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/lorenzo-vecchio/FattureHub/total?style=for-the-badge)

Applicazione desktop per filtrare, visualizzare, analizzare ed esportare fatture elettroniche in formato **FatturaPA** (standard SDI italiano). Versione **1.1.1**.

---

## Funzionalità

### Caricamento e parsing
- **Carica** file XML, ZIP e file firmati `.p7m` tramite drag-and-drop (file singoli, cartelle, ZIP) o selezione manuale
- I file `.p7m` vengono estratti automaticamente prima del parsing
- File metadati macOS (`._*`, `__MACOSX`) ignorati automaticamente

### Filtri
- Filtra per: fornitore, cliente, data, importo, tipo documento, regime fiscale, formato trasmissione, testo libero
- I filtri per fornitore e cliente sono **checkbox dinamiche** basate sui valori effettivamente presenti

### Visualizzazione
- **Dettaglio fattura**: cedente, cessionario, importi, righe di dettaglio, dati SDI
- **Scarica** il singolo XML originale dal dialog di dettaglio

### Esportazione
- **Esporta ZIP** le fatture filtrate — flat o raggruppate per fornitore / per cliente
- **Esporta DOCX** i report AI generati direttamente in Word

### Progetti
- **Salva progetti** su disco: sessione corrente (fatture + filtri) e riaprila in seguito
- **Gestione progetti**: lista con anteprima, apertura e cancellazione

### Analisi AI
- **Report AI** generati da un agente multi-fase che analizza le fatture caricate
- Supporto a modelli **Anthropic** (Claude e compatibili) e **OpenAI** (GPT e compatibili) configurabili
- Possibilità di configurare modelli separati per orchestratore e task
- **Conversazione continuativa**: raffina i report con domande successive nella stessa sessione
- Report salvati per progetto e visualizzati con rendering Markdown
- Tutta l'elaborazione AI avviene tramite chiamate IPC native (nessuna CORS restriction)

### Impostazioni
- **Tema chiaro/scuro/sistema** configurabile
- **Configurazione AI**: provider, modelli, chiave API — tutto salvato localmente

Nessun dato viene inviato a server esterni senza una chiave API configurata dall'utente.

---

## Stack

- [Tauri v2](https://tauri.app/) — shell desktop nativa (macOS, Windows, Linux)
- [SvelteKit](https://kit.svelte.dev/) + Svelte 5 + TypeScript
- [shadcn-svelte](https://www.shadcn-svelte.com/) + [Tailwind CSS v4](https://tailwindcss.com/)
- [Vercel AI SDK v6](https://sdk.vercel.ai/) (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`) per l'agente AI
- [JSZip](https://stuk.github.io/jszip/) per la gestione degli archivi
- [docx](https://docx.js.org/) per l'esportazione Word
- [marked](https://marked.js.org/) per il rendering Markdown dei report
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
| `.p7m` (XML con firma digitale)             | ✓ (estrazione automatica)|
| `.zip` contenente XML / `.p7m`             | ✓                        |
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
