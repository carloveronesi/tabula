# Design

## Theme

Nitido e tecnico (lignaggio **Linear / Vercel**): bianco puro, **neutri freddi**,
una sola famiglia **sans**, un **unico accento cobalto** usato solo per azioni,
selezione e "oggi". Niente calore: l'identità sta nella nitidezza, nella densità e
nell'accento — non in un colore di superficie o in un serif. La struttura è a filo
(hairline), non a riquadri. Supporto chiaro / scuro / sistema.

Strategia di colore: **Restrained** (neutri + un accento ≤ ~10% della superficie).

> Nota: la prima direzione (editoriale-calda: terracotta + serif) è stata
> abbandonata perché leggeva come "AI-warm". Vedi il critique in
> `.impeccable/critique/`.

## Color

OKLCH ovunque. Token definiti in `app/src/styles/index.css` (`:root` = chiaro,
`.dark` = scuro), esposti a Tailwind come nomi semantici in `tailwind.config.js`.

### Light (`:root`)

| Ruolo            | Token              | OKLCH                      | Uso |
|------------------|--------------------|----------------------------|-----|
| Pagina           | `--bg`             | `oklch(1 0 0)`             | sfondo app (bianco puro) |
| Superficie       | `--surface`        | `oklch(0.985 0.003 256)`   | pannelli, popover, barre |
| Rialzato         | `--raised`         | `oklch(0.965 0.004 256)`   | hover di superfici, righe attive |
| Inchiostro       | `--ink`            | `oklch(0.21 0.012 256)`    | testo corpo (cool near-black) |
| Attenuato        | `--muted`          | `oklch(0.50 0.018 256)`    | testo secondario (≥ 4.5:1) |
| Tenue            | `--faint`          | `oklch(0.64 0.015 256)`    | meta/disabilitato (testo grande) |
| Filo             | `--line`           | `oklch(0.918 0.005 256)`   | bordi hairline, divisori |
| Filo marcato     | `--line-strong`    | `oklch(0.85 0.008 256)`    | bordi enfatizzati |
| Accento (cobalto)| `--primary`/`--accent` | `oklch(0.55 0.17 258)` | unico accento: azioni, selezione, oggi, link, blocchi |
| Accento hover    | `--primary-hover`/`--accent-hover` | `oklch(0.49 0.18 258)` | |
| Testo su accento | `--primary-ink`/`--accent-ink` | `oklch(0.99 0.004 256)` | testo bianco su fill cobalto |
| Wash accento     | `--primary-wash`/`--accent-wash` | `oklch(0.955 0.03 258)` | sfondo tenue (blocchi-evento, oggi, selezione) |
| Pericolo         | `--danger`         | `oklch(0.55 0.20 25)`      | elimina/errore |

`--primary` e `--accent` sono **lo stesso cobalto** (un solo accento). I due nomi
restano per non toccare i componenti; i ruoli secondari (es. chip cliente) usano
neutri (`--raised`), non un secondo colore.

### Dark (`.dark`)

Near-black **freddo** puro (`--bg: oklch(0.165 0.006 256)`), inchiostro freddo
quasi-bianco; cobalto schiarito (`oklch(0.62 0.17 258)`) per reggere su scuro.
Vedi `index.css`.

### Regole

- Testo su fill cobalto (bottoni, badge): **bianco** (`*-ink`). I blocchi-evento
  usano il **wash** (cobalto tenue) con testo `--ink`/`--accent`, non il fill pieno.
- Il colore non è mai l'unico veicolo di significato: i blocchi portano
  etichetta/tipo accanto al colore.

## Typography

**Una sola famiglia sans** (niente display serif su UI prodotto). `Inter` se
presente, altrimenti stack di sistema (`system-ui`/Segoe UI) — costo zero di rete,
PWA offline. La gerarchia arriva da **peso e spaziatura**, non dal serif: i titoli
usano `font-weight 650` + `letter-spacing -0.011em`.

| Token          | Stack | Uso |
|----------------|-------|-----|
| `--font-sans`  | `"Inter", "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | tutto: titoli, UI, corpo, dati |
| `--font-serif` | alias di `--font-sans` (deprecato) | — |
| `--font-mono`  | `ui-monospace, "Cascadia Mono", "SF Mono", Menlo, monospace` | etichette orarie, numeri |

Etichette orarie e numeri: cifre tabellari (`tnum`). Scala **rem fissa** (~1.2):
`xs .75` · `sm .8125` · `base .9375` (15px) · `lg 1.0625` · `xl 1.25` · `2xl 1.5`
· `4xl 2.25`. `text-wrap: balance` su h1–h3.

## Spacing & Radii

Spaziatura: scala Tailwind di default (base 4px). Raggi piccoli:
`--radius-sm 4px` · `--radius 6px` · `--radius-lg 10px` · `--radius-pill 9999px`.

## Elevation

L'editoriale preferisce **bordi a filo** alle ombre. Le ombre servono solo agli
overlay: `--shadow-sm` (1px hover), `--shadow` (popover), `--shadow-lg` (modale).
Ombre basse e fredde, mai diffuse.

## Z-index

Scala semantica: `--z-dropdown 1000` · `--z-sticky 1100` · `--z-backdrop 1200`
· `--z-modal 1300` · `--z-toast 1400` · `--z-tooltip 1500`.

## Motion

Intenzionale e breve. Ease-out esponenziale (quart/expo), 120–220ms, nessun
rimbalzo. Ogni transizione ha l'alternativa `prefers-reduced-motion: reduce`
(crossfade o istantanea). I blocchi-evento entrano con un fade+rise minimo;
i popover con scale-from-95% + fade.

## Components (primitivi)

In `app/src/ui/`. Senza dipendenze esterne; accessibili da tastiera; focus visibile.

- **Button** — varianti `primary` (fill terracotta, testo bianco), `subtle`
  (superficie + filo), `ghost` (solo testo, hover su `--raised`), `danger`.
  Dimensioni `sm`/`md`. Focus ring su `--focus`.
- **IconButton** — quadrato, solo icona, `aria-label` obbligatorio.
- **Segmented** — gruppo a segmenti per lo switch vista (role `tablist`/bottoni
  con `aria-pressed`); il segmento attivo su `--raised` con inchiostro pieno.
- **Modal** — su `<dialog>` nativo (no clipping, focus-trap nativo, Esc), backdrop
  su `--z-backdrop`, pannello `--surface` + `--shadow-lg`.
- **Popover** — ancorato, `position: fixed` (niente clipping), Esc/blur per chiudere.
- **Combobox** — input filtrabile + lista navigabile da tastiera (↑/↓/Invio/Esc),
  `role="combobox"`/`listbox`/`option`; base per la cascata cliente→progetto.

## Theme application

`domain/theme.ts` `resolveTheme(setting, prefersDark)` (logica pura, testata) →
`light|dark`. Un hook applica/aggiorna la classe `.dark` su `<html>` da
`settings.theme` e da `matchMedia('(prefers-color-scheme: dark)')`.
