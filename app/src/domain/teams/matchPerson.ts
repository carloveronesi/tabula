import type { Contact, Id, Person } from "@/data/types";

export type MatchKind = "person" | "contact";

export interface PersonMatch {
  id: Id;
  kind: MatchKind;
  name: string;
  /** 0..1: 1 = uguaglianza esatta, scende con la distanza. */
  confidence: number;
}

/** Minimo per proporre il collegamento automatico in revisione. */
export const MATCH_THRESHOLD = 0.72;

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Insieme dei token (parole) del nome, normalizzati. */
function tokens(s: string): Set<string> {
  return new Set(fold(s).split(" ").filter(Boolean));
}

/** Distanza di Levenshtein iterativa (una sola riga di lavoro). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Similarità 0..1 tra due nomi, robusta all'ordine e ai refusi dell'OCR. */
export function nameSimilarity(a: string, b: string): number {
  const fa = fold(a);
  const fb = fold(b);
  if (!fa || !fb) return 0;
  if (fa === fb) return 1;

  // Sovrapposizione dei token (Jaccard): gestisce l'ordine "Rossi Mario".
  const ta = tokens(a);
  const tb = tokens(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const jaccard = shared / (ta.size + tb.size - shared);

  // Similarità per carattere sull'intera stringa: assorbe i refusi.
  const dist = levenshtein(fa, fb);
  const charSim = 1 - dist / Math.max(fa.length, fb.length);

  return Math.max(jaccard, charSim);
}

/**
 * Migliore corrispondenza per un nome letto dall'OCR tra persone e contatti.
 * Le persone (team) hanno la precedenza a parità di punteggio, perché sono i
 * colleghi con cui si fanno le chiamate. `null` sotto la soglia di confidenza.
 */
export function matchPerson(
  name: string,
  people: Person[],
  contacts: Contact[],
): PersonMatch | null {
  const candidates: { id: Id; kind: MatchKind; name: string }[] = [
    ...people.map((p) => ({ id: p.id, kind: "person" as const, name: p.name })),
    ...contacts.map((c) => ({ id: c.id, kind: "contact" as const, name: c.name })),
  ];

  let best: PersonMatch | null = null;
  for (const c of candidates) {
    const confidence = nameSimilarity(name, c.name);
    if (confidence > (best?.confidence ?? 0)) {
      best = { id: c.id, kind: c.kind, name: c.name, confidence };
    }
  }
  return best && best.confidence >= MATCH_THRESHOLD ? best : null;
}
