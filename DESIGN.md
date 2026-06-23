# Design

## Theme

Nitido e tecnico, ma **abitabile**: non più bianco-su-bianco da wireframe, bensì
**carta blu-fredda** (`--bg` tinto) su cui le **superfici bianche galleggiano**
(figura/sfondo). Navigazione a **rail laterale** di icone; il contenuto vive in un
pannello arrotondato con elevazione bassa. Resta l'identità: **neutri freddi**, una
sola famiglia **sans**, un **unico accento cobalto** (azioni, selezione, "oggi",
blocchi-evento), numeri/orari in **sans con cifre tabellari** (`tnum`). La profondità arriva da superficie +
raggio + ombra fredda, non dal colore di superficie. Supporto chiaro / scuro /
sistema.

Strategia di colore: **Restrained** (neutri + un accento ≤ ~10% della superficie).

> Storia: (1) editoriale-calda (terracotta + serif) abbandonata perché "AI-warm";
> (2) Linear/Vercel ultra-sobria (bianco puro, raggi 6px) percepita come "troppo
> banale". Direzione attuale ("Più audace", giugno 2026): carta fredda + superfici
> elevate + sidebar + raggi generosi, mantenendo l'unica voce cobalto.

## Color

OKLCH ovunque. Token definiti in `app/src/styles/index.css` (`:root` = chiaro,
`.dark` = scuro), esposti a Tailwind come nomi semantici in `tailwind.config.js`.

### Light (`:root`)

| Ruolo            | Token              | OKLCH                      | Uso |
|------------------|--------------------|----------------------------|-----|
| Pagina           | `--bg`             | `oklch(0.974 0.006 256)`   | sfondo app (carta blu-fredda, **non** bianco) |
| Superficie       | `--surface`        | `oklch(1 0 0)`             | pannelli/card bianchi che galleggiano sul fondo |
| Rialzato         | `--raised`         | `oklch(0.962 0.006 256)`   | hover di superfici, righe attive |
| Weekend          | `--weekend`        | `oklch(0.955 0.008 256)`   | celle sab/dom nel calendario |
| Inchiostro       | `--ink`            | `oklch(0.21 0.012 256)`    | testo corpo (cool near-black) |
| Attenuato        | `--muted`          | `oklch(0.50 0.018 256)`    | testo secondario (≥ 4.5:1) |
| Tenue            | `--faint`          | `oklch(0.64 0.015 256)`    | meta/disabilitato (testo grande) |
| Filo             | `--line`           | `oklch(0.905 0.006 256)`   | bordi hairline, divisori |
| Filo marcato     | `--line-strong`    | `oklch(0.83 0.01 256)`     | bordi enfatizzati |
| Accento (cobalto)| `--primary`/`--accent` | `oklch(0.55 0.17 258)` | unico accento: azioni, selezione, oggi, link, blocchi |
| Accento hover    | `--primary-hover`/`--accent-hover` | `oklch(0.49 0.18 258)` | |
| Testo su accento | `--primary-ink`/`--accent-ink` | `oklch(0.99 0.004 256)` | testo bianco su fill cobalto |
| Wash accento     | `--primary-wash`/`--accent-wash` | `oklch(0.955 0.03 258)` | sfondo tenue (blocchi-evento, oggi, selezione) |
| Pericolo         | `--danger`         | `oklch(0.55 0.20 25)`      | elimina/errore |
| Ora corrente     | `--now`            | `oklch(0.62 0.22 18)`      | linea "adesso" nel calendario (stile Teams) |

`--primary` e `--accent` sono **lo stesso cobalto** (un solo accento). I due nomi
restano per non toccare i componenti; i ruoli secondari (es. chip cliente) usano
neutri (`--raised`), non un secondo colore.

### Dark (`.dark`)

Near-black **freddo** puro (`--bg: oklch(0.165 0.006 256)`), inchiostro freddo
quasi-bianco; cobalto schiarito (`oklch(0.62 0.17 258)`) per reggere su scuro.
Vedi `index.css`.

### Regole

- Testo su fill cobalto (bottoni, badge): **bianco** (`*-ink`).
- **Blocchi-evento — colore per cliente/sottotipo.** Eccezione mirata alla regola
  della voce unica: ogni blocco porta una **barra colore** + un **wash** dello
  stesso colore (`withAlpha(color, 0.16)`), risolto da `entryColor()`
  (`clientColors`/`internalColors` con fallback deterministico `colorFromKey`).
  Ferie/evento senza cliente → accento cobalto di default. Tutto il *cromo* dell'UI
  (azioni, nav, oggi) resta a voce unica cobalto: il colore categoriale vive solo
  dentro i blocchi del calendario.
- Nel **Mese** ogni giorno mostra una **barra segmentata** per colore (larga in
  proporzione alle ore), i **nomi** delle attività (max 3 + "+N") e un'**icona
  della sede** (remoto/ufficio/cliente); la cella espone il conteggio in
  `aria-label` → il colore non è mai l'unico veicolo. Con un filtro del Riepilogo
  attivo (cliente, tipo o sede) i giorni corrispondenti spiccano e gli altri sfumano.
- Il colore non è mai l'unico veicolo di significato: i blocchi portano sempre
  **titolo** accanto al colore (leggibili anche in daltonismo).

## Typography

**Una sola famiglia sans** (niente display serif su UI prodotto). `Inter` se
presente, altrimenti stack di sistema (`system-ui`/Segoe UI) — costo zero di rete,
PWA offline. La gerarchia arriva da **peso e spaziatura**, non dal serif: i titoli
usano `font-weight 650` + `letter-spacing -0.011em`.

| Token          | Stack | Uso |
|----------------|-------|-----|
| `--font-sans`  | `"Inter", "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | tutto: titoli, UI, corpo, dati |
| `--font-serif` | alias di `--font-sans` (deprecato) | — |
| `--font-mono`  | `ui-monospace, "Cascadia Mono", "SF Mono", Menlo, monospace` | solo `code` nel markdown |

Etichette orarie e numeri: **stessa famiglia sans** (`--font-sans`) con **cifre
tabellari** (`tnum`), così l'incolonnamento non balla pur restando nel carattere
di tutto il resto. Il mono è riservato al `code` inline. Scala **rem fissa** (~1.2):
`xs .75` · `sm .8125` · `base .9375` (15px) · `lg 1.0625` · `xl 1.25` · `2xl 1.5`
· `4xl 2.25`. `text-wrap: balance` su h1–h3.

## Layout

**Sidebar** (`features/layout/Sidebar.tsx`): rail verticale a sinistra (~76px),
icona + etichetta per ogni sezione (Calendario, Riepilogo, Progetti, Todo, e in
basso Ricerca, Impostazioni); voce attiva su `--primary-wash` con indicatore a
filo. **TopBar** snella: toolbar del *calendario* (prec/oggi/succ in cluster pill,
titolo periodo, switch giorno/settimana/mese, annulla/ripeti, "Nuova"); per le
viste non-calendario mostra solo il titolo di sezione. Il contenuto vive in un
**pannello-superficie** arrotondato (`bg-surface` + `shadow-card`) sul fondo tinto.

**Shell ad altezza fissa** (`h-screen`, niente scroll di pagina): le viste
calendario (giorno/settimana/mese) **riempiono lo schermo** — la giornata 9–18
sta tutta a video senza scroll. Le righe orarie sono `flex-1` (riempimento via
CSS); l'altezza-slot reale per posizionare i blocchi è *misurata*
(`useFitSlotHeight`, `ResizeObserver`). Le viste a lista scorrono dentro il
pannello. Griglia oraria: **etichette e linee ogni 30 min** (leggibilità), con
snapping dei blocchi ancora a `slotMinutes` (15/30).

**Linea "ora corrente"** (`NowLine`, stile Teams): riga orizzontale in `--now`
(rosso, distinto dall'accento) con pallino, posizionata via `nowRowOffset` (puro,
gestisce i buchi della pausa) e aggiornata ogni minuto (`useNowMinute`). Compare
solo sul giorno odierno (vista Giorno; colonna di oggi in Settimana) e solo se
l'ora è nell'orario mostrato.

## Spacing & Radii

Spaziatura: scala Tailwind di default (base 4px). Raggi **generosi** (morbidi sui
contenitori, pill sui controlli): `--radius-sm 6px` · `--radius 10px` ·
`--radius-lg 14px` · `--radius-xl 18px` · `--radius-pill 9999px`.

## Elevation

Bordi a filo + **superfici che galleggiano**: `--shadow-card` posa pannelli/card
sul fondo tinto senza alzarli troppo. Ombre per overlay: `--shadow-sm` (hover),
`--shadow` (popover), `--shadow-lg` (modale). Tutte **basse e fredde**, mai diffuse.

## Z-index

Scala semantica: `--z-dropdown 1000` · `--z-sticky 1100` · `--z-backdrop 1200`
· `--z-modal 1300` · `--z-toast 1400` · `--z-tooltip 1500`.

## Motion

Intenzionale e breve. Ease-out esponenziale (quart/expo), 120–220ms, nessun
rimbalzo. Ogni transizione ha l'alternativa `prefers-reduced-motion: reduce`
(crossfade o istantanea). Keyframe condivisi in `index.css`: `.animate-modal-in`
(fade + rise + scale 0.985→1 sul pannello modale), `.animate-block-in` (fade+rise
minimo sui blocchi-evento). Backdrop modale con blur leggero.

## Components (primitivi)

In `app/src/ui/`. Senza dipendenze esterne; accessibili da tastiera; focus visibile.

- **Button** — **pill** (`rounded-pill`), press su `active:translate-y-px`.
  Varianti `primary` (fill cobalto, testo bianco, ombra), `subtle` (superficie +
  filo), `ghost` (solo testo), `danger`. Dimensioni `sm`/`md`. Focus ring `--focus`.
- **IconButton** — quadrato `rounded-lg`, solo icona, `aria-label` obbligatorio;
  stato premuto via `aria-pressed` (wash + accento).
- **Segmented** — gruppo a segmenti **pill** in scanalatura (`--bg`); attivo su
  `--surface` bianco con ombra. Role `group` + bottoni con `aria-pressed`.
- **TimeField** (`ui/TimeField.tsx`) — campo orario **senza dropdown**: testo
  digitabile tollerante ("9", "9:30", "930") con snap alla granularità, stepper ▲▼
  e frecce ↑/↓ (±`step` min). Logica pura in `domain/timeField.ts`. Sostituisce il
  nativo `type="time"`.
- **Icons** (`ui/icons.tsx`) — set a tratto inline (currentColor, 24×24), zero
  dipendenze per restare offline-first.
- **Modal** — su `<dialog>` nativo (no clipping, focus-trap nativo, Esc), backdrop
  su `--z-backdrop`, pannello `--surface` + `--shadow-lg`.
- **Popover** — ancorato, `position: fixed` (niente clipping), Esc/blur per chiudere.
- **ContextMenu** — menu contestuale ancorato a un punto (click destro sulla
  griglia), reso in **portale** con `position: fixed` clampata ai bordi: niente
  clipping né overflow del contenitore. Chiude con Esc / click fuori / scroll /
  resize; focus sulla prima voce; `role="menu"`/`menuitem`.
- **Combobox** — input filtrabile + lista navigabile da tastiera (↑/↓/Invio/Esc),
  `role="combobox"`/`listbox`/`option`; base per la cascata cliente→progetto.

## Theme application

`domain/theme.ts` `resolveTheme(setting, prefersDark)` (logica pura, testata) →
`light|dark`. Un hook applica/aggiorna la classe `.dark` su `<html>` da
`settings.theme` e da `matchMedia('(prefers-color-scheme: dark)')`.
