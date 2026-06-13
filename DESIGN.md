# Design

## Theme

Calmo ed editoriale: una pagina di carta bianca con inchiostro caldo. Le superfici
sono quiete e la struttura è a filo (hairline), non a riquadri. Il colore è speso
con parsimonia e porta significato, non decorazione. Metafora guida: **la matita
rossa e blu del correttore di bozze** — il terracotta marca le attività, l'indaco
marca i riferimenti (oggi, link, selezione). Supporto chiaro / scuro / sistema.

Strategia di colore: **Restrained** (neutri tinti + accenti ≤ ~10% della superficie).

## Color

OKLCH ovunque. Token definiti in `app/src/styles/index.css` (`:root` = chiaro,
`.dark` = scuro), esposti a Tailwind come nomi semantici in `tailwind.config.js`.

### Light (`:root`)

| Ruolo            | Token              | OKLCH                      | Uso |
|------------------|--------------------|----------------------------|-----|
| Pagina           | `--bg`             | `oklch(1 0 0)`             | sfondo app (bianco puro) |
| Superficie       | `--surface`        | `oklch(0.985 0.004 60)`    | pannelli, popover, barre |
| Rialzato         | `--raised`         | `oklch(0.965 0.005 60)`    | hover di superfici, righe attive |
| Inchiostro       | `--ink`            | `oklch(0.24 0.012 45)`     | testo corpo (≥ 13:1 su bg) |
| Attenuato        | `--muted`          | `oklch(0.50 0.012 45)`     | testo secondario (≥ 4.5:1) |
| Tenue            | `--faint`          | `oklch(0.66 0.010 45)`     | meta/disabilitato (testo grande) |
| Filo             | `--line`           | `oklch(0.92 0.004 60)`     | bordi hairline, divisori |
| Filo marcato     | `--line-strong`    | `oklch(0.86 0.006 60)`     | bordi enfatizzati |
| Primario         | `--primary`        | `oklch(0.585 0.158 33)`    | terracotta: attività, azione primaria, focus |
| Primario hover   | `--primary-hover`  | `oklch(0.545 0.16 33)`     | |
| Testo su prim.   | `--primary-ink`    | `oklch(0.985 0.004 60)`    | testo bianco su fill primario |
| Wash primario    | `--primary-wash`   | `oklch(0.95 0.030 33)`     | sfondo tenue dei blocchi-evento |
| Accento          | `--accent`         | `oklch(0.50 0.105 250)`    | indaco: oggi, link, selezione |
| Accento hover    | `--accent-hover`   | `oklch(0.46 0.11 250)`     | |
| Testo su acc.    | `--accent-ink`     | `oklch(0.985 0.004 250)`   | testo bianco su fill accento |
| Wash accento     | `--accent-wash`    | `oklch(0.95 0.025 250)`    | sfondo tenue (oggi, selezione) |
| Pericolo         | `--danger`         | `oklch(0.55 0.17 25)`      | elimina/errore |

### Dark (`.dark`)

Sfondo near-black caldo (non puro), inchiostro avorio caldo; primario/accento
schiariti per reggere su scuro. Vedi `index.css` per i valori.

### Regole

- Testo su fill saturo (primario/accento, badge): **bianco** (`*-ink`), mai scuro
  (effetto Helmholtz-Kohlrausch). I blocchi-evento usano il **wash** (sfondo tenue)
  con testo `--ink`, non il fill pieno: più calmo e più leggibile.
- Il colore non è mai l'unico veicolo di significato: i blocchi-evento portano
  etichetta/tipo accanto al colore.

## Typography

Coppia sull'asse di contrasto **serif display + sans UI**, a costo zero di rete
(font di sistema, PWA offline). I webfont si potranno impacchettare (`@fontsource`)
in seguito senza cambiare i token.

| Token          | Stack | Uso |
|----------------|-------|-----|
| `--font-serif` | `Georgia, "Iowan Old Style", "Palatino Linotype", serif` | intestazioni-data, titoli di sezione |
| `--font-sans`  | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | UI, corpo, controlli |
| `--font-mono`  | `ui-monospace, "Cascadia Mono", "SF Mono", Menlo, monospace` | etichette orarie, numeri |

Le etichette orarie e i numeri usano cifre tabellari (`font-feature-settings:"tnum"`).

Scala (rem, ~1.2): `xs .75` · `sm .8125` · `base .9375` (15px corpo) · `lg 1.0625`
· `xl 1.25` · `2xl 1.5` · `3xl clamp(1.75 … 2.25)` (data del giorno). Interlinea
1.1 per il display, 1.5 per il corpo. `text-wrap: balance` su h1–h3.

## Spacing & Radii

Spaziatura: scala Tailwind di default (base 4px). Raggi piccoli, editoriali:
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
