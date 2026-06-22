import { nanoid } from "nanoid";
import type { ISODate } from "@/data/types";
import { isoDate } from "@/domain/calendarNav";
import { minutesOfDay } from "@/domain/slots";
import { duplicateEntry, pastePlacement } from "@/domain/duplicate";
import { useUiStore } from "@/store";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import { useToastStore } from "@/store/toast";

/** Incollo mirato: giorno e minuto d'inizio preferiti (da click sulla griglia). */
export interface PasteTarget {
  date: ISODate;
  startMin: number;
}

/**
 * Incolla la entry negli appunti. Senza `target` mira al giorno attivo e
 * conserva l'orario originale; con `target` mira a quel giorno/slot. In entrambi
 * i casi ripiega sul primo slot libero se la fascia preferita è occupata. Legge
 * gli store via `getState` così è usabile da scorciatoia, bottone o menu.
 */
export async function pasteEntry(target?: PasteTarget): Promise<void> {
  const clip = useEditorStore.getState().clipboard;
  if (!clip) return;

  const notify = useToastStore.getState().notify;
  const date = target?.date ?? isoDate(useUiStore.getState().activeDate);
  const preferredStart = target?.startMin ?? minutesOfDay(clip.startsAt);
  const { settings } = useSettingsStore.getState();
  const { entries, saveEntry, undo } = useCalendarStore.getState();

  const duration = minutesOfDay(clip.endsAt) - minutesOfDay(clip.startsAt);
  const range = pastePlacement(
    entries,
    date,
    duration,
    preferredStart,
    { startMin: settings.workHours.morningStart, endMin: settings.workHours.afternoonEnd },
    settings.slotMinutes,
  );
  if (!range) {
    notify("Nessuno spazio libero in giornata");
    return;
  }

  await saveEntry(
    duplicateEntry(clip, date, range.startMin, range.endMin, nanoid(), Date.now()),
  );
  notify("Attività incollata", {
    action: { label: "Annulla", run: () => void undo() },
  });
}
