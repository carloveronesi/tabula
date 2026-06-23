/**
 * Parser del testo OCR della cronologia chiamate di Microsoft Teams.
 *
 * La lista Teams non riporta l'orario d'inizio: per ogni chiamata mostra solo
 * nome, direzione (in arrivo/uscita), giorno relativo e *durata*. L'OCR rende
 * ogni chiamata su due righe con più campi ciascuna e rumore (iniziali avatar,
 * icone), tipo:
 *
 *   @ Martina Pastore   leri
 *   W' In uscita 6m 55s
 *
 * Qui ricaviamo i quattro dati cercandoli ovunque nella riga, con regole
 * tolleranti ai refusi (es. "Ieri" letto "leri"). La risoluzione del giorno e il
 * posizionamento vivono altrove (`resolveDay`, `placeCalls`): questo modulo è
 * puro e legge soltanto ciò che lo screenshot dice.
 */

export type CallDirection = "in" | "out";

export interface ParsedCall {
  name: string;
  direction: CallDirection | null;
  /** Etichetta grezza del giorno così come letta ("leri", "venerdì", "12/06"). */
  dayLabel: string | null;
  /** Durata in minuti, arrotondata, minimo 1. */
  durationMin: number;
}

/** Normalizza per i confronti: minuscole e accenti rimossi. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const WEEKDAYS_FOLDED = [
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
  "domenica",
];
// "leri" è "Ieri" letto male dall'OCR (I maiuscola → l minuscola).
const RELATIVE_FOLDED = ["oggi", "ieri", "leri"];

// Durata in coda alla riga: una o più componenti h/m/s ("6m 55s", "1h", "2h 2m").
const DURATION_RUN = /((?:\d+\s*[hms]\b\s*)+)$/;
const DIRECTION_IN = /\bin\s+arrivo\b/;
const DIRECTION_OUT = /\bin\s+uscita\b/;
// Token-nome: parola capitalizzata con corpo minuscolo (esclude "W'", "In", "©").
const NAME_TOKEN = /^[A-ZÀ-Ý][a-zà-ÿ]+(?:['-][a-zà-ÿ]+)*$/;

/**
 * Durata espressa come combinazione di ore/minuti/secondi ("2h 2m", "28m 25s",
 * "1h", "6m 55s") → minuti arrotondati (minimo 1). `null` se la stringa non è una
 * durata. I secondi contribuiscono all'arrotondamento ma non scendono sotto 1.
 */
export function parseDuration(text: string): number | null {
  const f = fold(text);
  if (!/^(\d+\s*[hms]\s*)+$/.test(f)) return null;
  let total = 0;
  let matched = false;
  for (const m of f.matchAll(/(\d+)\s*([hms])/g)) {
    matched = true;
    const n = Number(m[1]);
    if (m[2] === "h") total += n * 3600;
    else if (m[2] === "m") total += n * 60;
    else total += n;
  }
  if (!matched) return null;
  return Math.max(1, Math.round(total / 60));
}

/** Durata in coda alla riga → minuti, o null. */
function detectDuration(line: string): number | null {
  const m = fold(line).match(DURATION_RUN);
  return m ? parseDuration(m[1]) : null;
}

/** Direzione ovunque nella riga. */
function detectDirection(line: string): CallDirection | null {
  const f = fold(line);
  if (DIRECTION_IN.test(f)) return "in";
  if (DIRECTION_OUT.test(f)) return "out";
  return null;
}

/** Etichetta di giorno (relativa, nome-giorno o data numerica) ovunque nella riga. */
function detectDayLabel(line: string): string | null {
  for (const tok of line.split(/\s+/)) {
    const f = fold(tok);
    if (RELATIVE_FOLDED.includes(f)) return tok;
    if (WEEKDAYS_FOLDED.includes(f)) return tok;
    if (/^\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?$/.test(f)) return tok;
  }
  return null;
}

/**
 * Nome nella riga: rimuove giorno, direzione e durata, poi raccoglie i token
 * capitalizzati rimasti (le iniziali avatar e le icone non lo sono). Stringa
 * vuota se la riga non contiene un nome.
 */
function extractName(line: string, dayLabel: string | null): string {
  let rest = line;
  if (dayLabel) rest = rest.replace(dayLabel, " ");
  rest = rest
    .replace(/\bin\s+(arrivo|uscita)\b/gi, " ")
    .replace(/(\d+\s*[hms]\b\s*)+$/i, " ");
  const tokens = rest.split(/\s+/).filter((t) => NAME_TOKEN.test(t));
  return tokens.join(" ");
}

/**
 * Scompone il testo OCR in chiamate. Una nuova chiamata inizia su ogni riga che
 * contiene un nome (porta con sé il giorno, sulla stessa riga); le righe
 * successive senza nome (direzione + durata) la completano. Le chiamate senza
 * durata leggibile vengono scartate: senza durata non c'è uno slot da abbozzare.
 */
export function parseTeamsHistory(text: string): ParsedCall[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const calls: ParsedCall[] = [];
  let current: ParsedCall | null = null;
  const flush = () => {
    if (current && current.durationMin > 0) calls.push(current);
  };

  for (const line of lines) {
    const day = detectDayLabel(line);
    const dir = detectDirection(line);
    const dur = detectDuration(line);
    const name = extractName(line, day);

    if (name) {
      flush();
      current = { name, direction: dir, dayLabel: day, durationMin: dur ?? 0 };
      continue;
    }
    if (!current) continue; // rumore prima della prima chiamata
    if (dir && current.direction === null) current.direction = dir;
    if (day && current.dayLabel === null) current.dayLabel = day;
    if (dur && current.durationMin === 0) current.durationMin = dur;
  }
  flush();

  return calls;
}
