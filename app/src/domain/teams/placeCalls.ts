import type { Contact, ISODate, Person } from "@/data/types";
import { buildSlots, type WorkHours } from "@/domain/slots";
import type { ParsedCall } from "@/domain/teams/parseHistory";
import { resolveDayLabel } from "@/domain/teams/resolveDay";
import { matchPerson, type PersonMatch } from "@/domain/teams/matchPerson";

/**
 * Una chiamata trasformata in proposta di slot, pronta per la revisione.
 * `date`/`startMin`/`endMin` sono un suggerimento: l'orario d'inizio non esiste
 * nello screenshot, quindi impiliamo le chiamate dall'inizio giornata e l'utente
 * le sposta. `match` è il collegamento all'anagrafica, da confermare.
 */
export interface CallProposal {
  call: ParsedCall;
  date: ISODate;
  startMin: number;
  endMin: number;
  match: PersonMatch | null;
}

export interface PlaceContext {
  people: Person[];
  contacts: Contact[];
  workHours: WorkHours;
  slotMinutes: number;
  today: Date;
}

/**
 * Costruisce le proposte di slot dalle chiamate lette. Per ogni giorno le impila
 * in sequenza a partire dal primo slot lavorativo, ciascuna lunga quanto la sua
 * durata (l'inizio resta agganciato a uno slot, altrimenti il blocco non
 * comparirebbe sulla griglia). Le chiamate senza giorno leggibile ricadono su
 * oggi. L'ordine d'arrivo è preservato.
 */
export function buildProposals(
  calls: ParsedCall[],
  ctx: PlaceContext,
): CallProposal[] {
  const slots = buildSlots(ctx.workHours, ctx.slotMinutes).all;
  const lastSlot = slots.length - 1;
  const todayISO = ctx.today
    ? `${ctx.today.getFullYear()}-${String(ctx.today.getMonth() + 1).padStart(2, "0")}-${String(ctx.today.getDate()).padStart(2, "0")}`
    : "";

  // Cursore di slot per giorno: chiamate dello stesso giorno non si sovrappongono.
  const cursorByDay = new Map<ISODate, number>();

  return calls.map((call) => {
    const date = resolveDayLabel(call.dayLabel, ctx.today) ?? todayISO;
    const cursor = cursorByDay.get(date) ?? 0;
    const slotIndex = slots.length === 0 ? 0 : Math.min(cursor, lastSlot);
    const startMin = slots[slotIndex] ?? ctx.workHours.morningStart;
    const endMin = startMin + call.durationMin;

    const span = Math.max(1, Math.ceil(call.durationMin / ctx.slotMinutes));
    cursorByDay.set(date, cursor + span);

    const match = matchPerson(call.name, ctx.people, ctx.contacts);
    return { call, date, startMin, endMin, match };
  });
}
