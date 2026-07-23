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
