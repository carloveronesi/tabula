import type { EntryDraft } from "@/domain/entryDraft";
import type { CallProposal } from "@/domain/teams/placeCalls";
import type { CallDirection } from "@/domain/teams/parseHistory";

const DIRECTION_LABEL: Record<CallDirection, string> = {
  in: "in arrivo",
  out: "in uscita",
};

/** Nota generata per una chiamata: marca la provenienza e la direzione. */
export function callNote(direction: CallDirection | null): string {
  const base = "Chiamata Teams";
  return direction ? `${base} · ${DIRECTION_LABEL[direction]}` : base;
}

/**
 * Converte una proposta (eventualmente già corretta in revisione) nella bozza
 * dell'editor. La chiamata diventa un evento col nome come titolo; la persona
 * collegata finisce tra collaboratori (team) o contatti secondo il tipo di match.
 */
export function proposalToDraft(p: CallProposal): EntryDraft {
  const isPerson = p.match?.kind === "person";
  const isContact = p.match?.kind === "contact";
  return {
    title: p.call.name,
    date: p.date,
    startMin: p.startMin,
    endMin: p.endMin,
    type: "event",
    clientId: null,
    projectId: null,
    subtypeId: null,
    notes: callNote(p.call.direction),
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: "",
    collaboratorIds: isPerson && p.match ? [p.match.id] : [],
    contactIds: isContact && p.match ? [p.match.id] : [],
  };
}
