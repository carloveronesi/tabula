import type { Id } from "@/data/types";

/** Minuscolo, senza accenti: "Niccolò" e "NICCOLO" devono coincidere. */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/**
 * Parole di almeno tre lettere.
 * ponytail: sotto le tre lettere si aggancerebbero particelle ("di", "de") e
 * nomi brevissimi resterebbero fuori; se serve, la soglia va gestita con una
 * lista di particelle da ignorare, non abbassandola.
 */
const words = (s: string): string[] =>
  normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3);

/**
 * Persone nominate in un testo libero, cercate fra i candidati dati (il team di
 * un progetto, i referenti di un cliente). Match per parola intera: "Anna" non
 * si aggancia ad "annali".
 *
 * Un nome che indica più candidati (due "Mario") non ne sceglie nessuno: qui
 * sbagliare persona è peggio che non trovarla, perché il campo verrebbe
 * riempito con qualcuno che non c'era. Pura.
 */
export function namesInText(
  text: string,
  candidates: { id: Id; name: string }[],
): Id[] {
  const inText = new Set(words(text));
  const hit = new Set<Id>();

  // Una parola vale solo se punta a un candidato solo.
  for (const w of inText) {
    const owners = candidates.filter((c) => words(c.name).includes(w));
    if (owners.length === 1) hit.add(owners[0].id);
  }

  return candidates.filter((c) => hit.has(c.id)).map((c) => c.id);
}

/**
 * Toglie da un testo le parole che sono nomi (o cognomi) dei candidati dati.
 * Serve prima di mandare testo scritto dall'utente a un provider esterno: i
 * titoli delle attività sono pieni di "call con Marta", e i nomi delle persone
 * non devono uscire dal browser.
 *
 * A differenza di `namesInText` qui non conta a chi punta la parola: se è il
 * nome di qualcuno in anagrafica sparisce, anche quando è ambigua. Sbagliare
 * per eccesso costa una parola in meno nel prompt. Pura.
 */
export function redactNames(
  text: string,
  candidates: { name: string }[],
): string {
  const banned = new Set(candidates.flatMap((c) => words(c.name)));
  if (banned.size === 0) return text;
  // Si ricalca il testo originale parola per parola per non perdere
  // punteggiatura, accenti e maiuscole di tutto il resto.
  return text
    .replace(/[\p{L}\p{N}]+/gu, (w) => (banned.has(normalize(w)) ? "…" : w))
    .replace(/(?:…[\s,]*)+…/gu, "…");
}
