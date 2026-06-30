/**
 * Dalla riga grezza di un evento di calendario alla bozza dell'editor.
 *
 * Il testo del blocco mette spesso il referente in coda al titolo ("AI ACT
 * Alberico Aramini"): proviamo a staccare gli ultimi 1–3 token se combaciano con
 * una persona/contatto in anagrafica (soglia più severa del solito, per non
 * rubare parole al titolo). Se non combacia, il titolo resta intero e l'utente
 * collega a mano in revisione.
 */

import type { EntryDraft } from "@/domain/entryDraft";
import type { ISODate } from "@/data/types";
import type { Contact, Person } from "@/data/types";
import {
  matchPerson,
  nameSimilarity,
  type PersonMatch,
} from "@/domain/teams/matchPerson";

/** Più severa di MATCH_THRESHOLD: qui un falso positivo accorcia il titolo. */
const SUFFIX_THRESHOLD = 0.85;

export function splitTitleAndPerson(
  text: string,
  people: Person[],
  contacts: Contact[],
): { title: string; match: PersonMatch | null } {
  const tokens = text.split(/\s+/).filter(Boolean);
  let best: { match: PersonMatch; from: number } | null = null;

  for (let n = 1; n <= Math.min(3, tokens.length - 1); n++) {
    const candidate = tokens.slice(tokens.length - n).join(" ");
    const m = matchPerson(candidate, people, contacts);
    if (
      m &&
      nameSimilarity(candidate, m.name) >= SUFFIX_THRESHOLD &&
      (!best || m.confidence > best.match.confidence)
    ) {
      best = { match: m, from: tokens.length - n };
    }
  }

  if (best) {
    return { title: tokens.slice(0, best.from).join(" ").trim(), match: best.match };
  }
  return { title: text, match: matchPerson(text, people, contacts) };
}

/** Bozza per un evento importato dal calendario: titolo, orario, referente. */
export function eventToDraft(input: {
  title: string;
  date: ISODate;
  startMin: number;
  durationMin: number;
  match: PersonMatch | null;
}): EntryDraft {
  const isPerson = input.match?.kind === "person";
  const isContact = input.match?.kind === "contact";
  return {
    title: input.title,
    date: input.date,
    startMin: input.startMin,
    endMin: input.startMin + input.durationMin,
    type: "event",
    clientId: null,
    projectId: null,
    subtypeId: null,
    notes: "",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: "",
    collaboratorIds: isPerson && input.match ? [input.match.id] : [],
    contactIds: isContact && input.match ? [input.match.id] : [],
  };
}
