import { nanoid } from "nanoid";
import type { Entry } from "@/data/types";
import { minutesOfDay } from "@/domain/slots";
import {
  firstFreeRange,
  duplicateEntry as buildDuplicate,
} from "@/domain/duplicate";
import { templateFromEntry } from "@/domain/activityTemplate";
import { isoDate } from "@/domain/calendarNav";
import { useUiStore } from "@/store";
import { useEditorStore, type Anchor } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import { useTemplateStore } from "@/store/templates";
import { useToastStore } from "@/store/toast";

/**
 * Azioni su una singola attività, condivise fra il pannello dettaglio e il menu
 * contestuale (tasto destro sul blocco). Leggono gli store via `getState` così
 * sono richiamabili da bottone, scorciatoia o menu, senza dipendere dal render.
 * L'unica fonte di verità per copia/duplica/elimina vive qui.
 */

/**
 * Nuova attività da bottone, tasto N o "Aggiungi attività": un solo punto, così
 * i tre ingressi non divergono. Fuori dal calendario la data è oggi (non l'ultimo
 * periodo navigato, che falserebbe i totali); l'orario è la prima ora libera
 * della giornata lavorativa. Apre il quick-add, da cui "Più dettagli" porta
 * all'editor completo.
 */
export function startNewEntry(anchor: Anchor | null = null): void {
  const { view, activeDate } = useUiStore.getState();
  const { settings } = useSettingsStore.getState();
  const { entries } = useCalendarStore.getState();

  const calendar = view === "day" || view === "week" || view === "month";
  const date = isoDate(calendar ? activeDate : new Date());
  const wh = settings.workHours;
  // ponytail: non salta la pausa pranzo, come duplicateEntry; l'orario resta
  // modificabile nel quick-add.
  const range = firstFreeRange(
    entries,
    date,
    60,
    { startMin: wh.morningStart, endMin: wh.afternoonEnd },
    settings.slotMinutes,
  ) ?? { startMin: wh.morningStart, endMin: wh.morningStart + 60 };
  useEditorStore.getState().openQuickAdd({ date, ...range, anchor });
}

/** Copia l'attività negli appunti, pronta per "Incolla qui" o ⌘V. */
export function copyEntry(entry: Entry): void {
  useEditorStore.getState().copyEntry(entry);
  useToastStore
    .getState()
    .notify("Attività copiata — incolla con ⌘V o tasto destro sul giorno");
}

/**
 * Crea una copia nel primo slot libero della stessa giornata. Ritorna `true` se
 * è stata inserita, `false` se non c'era spazio (in tal caso avvisa e basta).
 */
export async function duplicateEntry(entry: Entry): Promise<boolean> {
  const notify = useToastStore.getState().notify;
  const { settings } = useSettingsStore.getState();
  const { entries, saveEntry, undo } = useCalendarStore.getState();

  const date = entry.startsAt.slice(0, 10);
  const duration = minutesOfDay(entry.endsAt) - minutesOfDay(entry.startsAt);
  const wh = settings.workHours;
  const range = firstFreeRange(
    entries,
    date,
    duration,
    { startMin: wh.morningStart, endMin: wh.afternoonEnd },
    settings.slotMinutes,
  );
  if (!range) {
    notify("Nessuno spazio libero in giornata");
    return false;
  }

  await saveEntry(
    buildDuplicate(entry, date, range.startMin, range.endMin, nanoid(), Date.now()),
  );
  notify("Attività duplicata", {
    action: { label: "Annulla", run: () => void undo() },
  });
  return true;
}

/** Salva l'attività come template, riusabile dai chip della creazione rapida. */
export async function saveAsTemplate(entry: Entry): Promise<void> {
  await useTemplateStore
    .getState()
    .saveTemplate(templateFromEntry(entry, nanoid(), Date.now()));
  useToastStore
    .getState()
    .notify("Template salvato — lo trovi nella creazione rapida");
}

/** Elimina l'attività, con possibilità di annullare dal toast. */
export async function deleteEntry(entry: Entry): Promise<void> {
  const { removeEntry, undo } = useCalendarStore.getState();
  const notify = useToastStore.getState().notify;
  await removeEntry(entry.id);
  notify("Attività eliminata", {
    action: { label: "Annulla", run: () => void undo() },
  });
}
