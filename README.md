# Filtro Fatture Elettroniche

Strumento web per filtrare, visualizzare ed esportare fatture elettroniche in formato **FatturaPA** (standard SDI italiano).

> Nato in fretta su richiesta di amici, costruito con l'aiuto dell'AI. Funziona, è veloce, e fa quello che deve fare.

---

## Cosa fa

- **Carica** file XML o archivi ZIP contenenti fatture FatturaPA — tramite drag-and-drop (file, cartelle, ZIP) o selezione manuale
- **Filtra** per: fornitore, cliente, data, importo, tipo documento, regime fiscale, formato trasmissione, testo libero
- I filtri per fornitore e cliente sono **checkbox dinamiche**: mostrano solo i valori effettivamente presenti tra le fatture caricate
- **Visualizza i dettagli** di ogni fattura in un dialog (cedente, cessionario, importi, linee, dati SDI)
- **Esporta** le fatture filtrate come ZIP — flat o raggruppate per fornitore / per cliente (una sottocartella per ciascuno)
- **Scarica** il singolo XML originale direttamente dal dialog di dettaglio

Tutto gira **nel browser**, nessun dato viene inviato a server esterni.

---

## Stack

- [SvelteKit](https://kit.svelte.dev/) + TypeScript
- [shadcn-svelte](https://www.shadcn-svelte.com/) + [Tailwind CSS v4](https://tailwindcss.com/)
- [JSZip](https://stuk.github.io/jszip/) per la gestione degli archivi
- Parsing XML nativo via `DOMParser`

---

## Avvio

```bash
npm install
npm run dev
```

### Build statica

Il progetto usa `@sveltejs/adapter-static` ed è pensato per essere deployato come sito statico (Vercel, Netlify, GitHub Pages, ecc.).

```bash
npm run build
```

---

## Formati supportati

| Formato                                     | Supporto                 |
| ------------------------------------------- | ------------------------ |
| `.xml` FatturaPA ordinaria (FPR12)        | ✓                       |
| `.xml` FatturaPA PA (FPA12)               | ✓                       |
| `.zip` contenente XML                     | ✓                       |
| Cartella trascinata nel browser             | ✓                       |
| File metadati macOS (`._*`, `__MACOSX`) | ignorati automaticamente |

---

## Limitazioni note

- Il parser legge solo il **primo body** per fattura (fatture multi-body parzialmente supportate per i totali)
- Nessuna validazione della firma digitale
- Interfaccia solo in italiano
