/**
 * Parser geometrico di uno screenshot del calendario (vista giorno/settimana).
 *
 * A differenza della cronologia chiamate Teams, qui lo screenshot *contiene già*
 * l'orario: la posizione verticale di un blocco è il suo inizio, e il righello
 * delle ore a sinistra dà la scala pixel→minuti.
 *
 * Lavoriamo a livello di *parola*: su una griglia Tesseract fonde in un'unica
 * riga il testo di colonne diverse (e ci attacca il numero dell'ora), quindi le
 * righe OCR sono inaffidabili. I riquadri delle singole parole, invece, sono
 * fedeli: raggruppiamo noi parole→righe→blocchi dentro ciascuna colonna.
 *
 * Modulo puro: riceve le parole già riconosciute (`OcrWord`) e non sa nulla di
 * OCR, anagrafica o React. La calibrazione è una retta ai minimi quadrati sulle
 * etichette d'ora, così un numero letto male non sballa tutto.
 *
 * ponytail: la durata è una stima. Lo screenshot mostra il testo, non il bordo
 * della card, quindi un blocco di 30' e uno di 60' con una riga sola sono
 * identici: cadono al minimo (uno slot) e l'utente li corregge in revisione.
 * Recuperiamo bene solo i blocchi alti (più righe di testo).
 */

import type { OcrWord } from "@/data/ocr/recognizeImage";

export interface GridEvent {
  /** Testo del blocco (titolo, eventualmente col referente in coda). */
  title: string;
  /** Minuti dalla mezzanotte, agganciati allo slot. */
  startMin: number;
  durationMin: number;
}

export interface GridColumn {
  /** Etichetta del giorno per scegliere la colonna ("29 Lun"). */
  label: string;
  events: GridEvent[];
}

// Ore plausibili sul righello: 6..22. I numeri-data dell'intestazione (29, 30,
// 01, 02, 03) restano fuori (29/30 > 22, 01/02/03 < 6): non li scambiamo per ore.
const HOUR_RE = /^([6-9]|1\d|2[0-2])$/;
const WEEKDAY_RE = /^(lun|mar|mer|gio|ven|sab|dom)/i;
// Sotto questa confidenza è quasi sempre la barra colorata o un'icona dell'evento
// letta come "(", "|", "©": rumore in testa al titolo.
const MIN_CONF = 35;

/** Toglie spazzatura iniziale (barra/icona) e spazi doppi dal titolo. */
function cleanTitle(s: string): string {
  return s
    .replace(/^[^\p{L}\p{N}[]+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

const yc = (w: OcrWord) => (w.y0 + w.y1) / 2;
const xc = (w: OcrWord) => (w.x0 + w.x1) / 2;

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Retta minuti = a·y + b ai minimi quadrati sulle etichette d'ora. */
function fitMinutesAtY(anchors: { y: number; min: number }[]): (y: number) => number {
  const n = anchors.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const { y, min } of anchors) {
    sx += y; sy += min; sxx += y * y; sxy += y * min;
  }
  const denom = n * sxx - sx * sx;
  const a = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const b = (sy - a * sx) / n;
  return (y) => a * y + b;
}

interface Row {
  text: string;
  yTop: number;
  yBottom: number;
}

/** Parole di una colonna → righe di testo (parole con la stessa y), ordinate. */
function toRows(words: OcrWord[], lineGap: number): Row[] {
  const sorted = [...words].sort((a, b) => yc(a) - yc(b));
  const groups: OcrWord[][] = [];
  let lastY = -Infinity;
  for (const w of sorted) {
    if (yc(w) - lastY > lineGap) groups.push([]);
    groups[groups.length - 1].push(w);
    lastY = yc(w);
  }
  return groups.map((g) => ({
    text: [...g].sort((a, b) => a.x0 - b.x0).map((w) => w.text).join(" "),
    yTop: Math.min(...g.map((w) => w.y0)),
    yBottom: Math.max(...g.map((w) => w.y1)),
  }));
}

/**
 * Estrae le colonne (giorni) e i loro eventi dalle parole OCR. Ritorna `[]` se
 * non trova almeno due etichette d'ora per calibrare la scala temporale.
 */
export function parseCalendarGrid(
  words: OcrWord[],
  slotMinutes: number,
): GridColumn[] {
  const snap = (m: number) => Math.round(m / slotMinutes) * slotMinutes;
  const clean = words
    .map((w) => ({ ...w, text: w.text.trim() }))
    .filter((w) => w.text.length > 0);

  // 1. Righello delle ore: parole-numero 6..22 allineate nella colonna più a
  //    sinistra (stesso x0 a meno della loro larghezza).
  const nums = clean.filter((w) => HOUR_RE.test(w.text));
  if (nums.length < 2) return [];
  const minX0 = Math.min(...nums.map((w) => w.x0));
  const gutter = nums
    .filter((w) => w.x0 <= minX0 + (w.x1 - w.x0) + 6)
    .sort((a, b) => yc(a) - yc(b));
  if (gutter.length < 2) return [];

  const minutesAtY = fitMinutesAtY(
    gutter.map((w) => ({ y: yc(w), min: Number(w.text) * 60 })),
  );
  const firstHourTop = Math.min(...gutter.map((w) => w.y0));
  const gutterRight = Math.max(...gutter.map((w) => w.x1));

  // 2. Colonne dalle intestazioni-giorno (sopra la prima ora). Senza giorni
  //    riconosciuti, una colonna sola a destra del righello.
  const header = clean.filter((w) => w.y1 < firstHourTop);
  const weekdays = header
    .filter((w) => WEEKDAY_RE.test(w.text))
    .sort((a, b) => xc(a) - xc(b));
  const headerNums = header.filter((w) => /^\d{1,2}$/.test(w.text));

  const centers = weekdays.length
    ? weekdays.map(xc)
    : [(gutterRight + Math.max(...clean.map((w) => w.x1))) / 2];

  const labelOf = (i: number): string => {
    const wd = weekdays[i];
    if (!wd) return "Giorno";
    const num = headerNums
      .map((n) => ({ n, d: Math.abs(xc(n) - xc(wd)) }))
      .sort((a, b) => a.d - b.d)[0]?.n.text;
    return num ? `${num} ${wd.text}` : wd.text;
  };

  // Confini orizzontali: punto medio tra centri adiacenti; a sinistra il righello.
  const edges = centers.map((c, i) => ({
    left: i === 0 ? gutterRight : (centers[i - 1] + c) / 2,
    right: i === centers.length - 1 ? Infinity : (c + centers[i + 1]) / 2,
  }));

  // 3. Parole-contenuto: sotto le intestazioni, a destra del righello, con
  //    lettere o token abbastanza lunghi (esclude ore, icone e rumore corto).
  const content = clean.filter(
    (w) =>
      w.y0 >= firstHourTop &&
      w.x0 >= gutterRight - 2 &&
      w.confidence >= MIN_CONF &&
      (/[a-zA-Z]/.test(w.text) || w.text.length >= 3),
  );
  if (content.length === 0) return centers.map((_, i) => ({ label: labelOf(i), events: [] }));

  const h = median(content.map((w) => w.y1 - w.y0));
  const lineGap = 0.6 * h; // parole oltre questo salto verticale = riga nuova
  const blockGap = 0.9 * h; // righe oltre questo salto = evento nuovo

  return centers.map((_, col) => {
    const mine = content.filter((w) => {
      const x = xc(w);
      return x >= edges[col].left && x < edges[col].right;
    });
    const rows = toRows(mine, lineGap);

    // Raggruppa le righe in blocchi: un salto verticale ampio apre un evento.
    const blocks: Row[][] = [];
    for (const r of rows) {
      const cur = blocks[blocks.length - 1];
      const prev = cur?.[cur.length - 1];
      if (!prev || r.yTop - prev.yBottom > blockGap) blocks.push([r]);
      else cur.push(r);
    }

    const events = blocks
      .map((b) => {
        const yTop = Math.min(...b.map((r) => r.yTop));
        const yBottom = Math.max(...b.map((r) => r.yBottom));
        return {
          title: cleanTitle(b.map((r) => r.text).join(" ")),
          startMin: snap(minutesAtY(yTop)),
          textSpan: minutesAtY(yBottom) - minutesAtY(yTop),
        };
      })
      .sort((a, b) => a.startMin - b.startMin);

    // Durata: lo span del testo (+ uno slot per il padding inferiore della card),
    // arrotondato allo slot, mai sotto uno slot né oltre l'inizio del successivo.
    return {
      label: labelOf(col),
      events: events.map((e, i) => {
        const gapToNext =
          i < events.length - 1 ? events[i + 1].startMin - e.startMin : 120;
        const dur = snap(e.textSpan + slotMinutes);
        return {
          title: e.title,
          startMin: e.startMin,
          durationMin: Math.min(
            Math.max(dur, slotMinutes),
            Math.max(slotMinutes, gapToNext),
          ),
        };
      }),
    };
  });
}
