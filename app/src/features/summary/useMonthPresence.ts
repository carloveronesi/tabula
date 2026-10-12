import { useMemo } from "react";
import { monthPresence, suggestPresenceDays } from "@/domain/presence";
import { availableMinutes } from "@/domain/capacity";
import { dowMon0, isoDate, workingDatesOfMonth } from "@/domain/calendarNav";
import { useUiStore } from "@/store";
import { useCalendarStore } from "@/store/calendar";
import { usePresenceStore } from "@/store/presence";
import { useSettingsStore } from "@/store/settings";

const dowOf = (d: string) => dowMon0(new Date(`${d}T12:00:00`));

/**
 * Bilancio presenze del mese attivo, condiviso da pannello e griglia: i numeri,
 * i giorni suggeriti per il planning (preferiti, liberi, fino ai mancanti) e i
 * giorni pianificabili (feriali da oggi in poi, ferie escluse).
 */
export function useMonthPresence() {
  const entries = useCalendarStore((s) => s.entries);
  const settings = useSettingsStore((s) => s.settings);
  const metas = usePresenceStore((s) => s.metas);
  const activeDate = useUiStore((s) => s.activeDate);
  const todayISO = isoDate(new Date());

  return useMemo(() => {
    const workingDates = workingDatesOfMonth(
      activeDate,
      settings.workingDays,
      settings.patronDay,
    );
    // Ferie intere: escono dalla base dell'obiettivo.
    const vacation = new Set(
      workingDates.filter(
        (d) =>
          availableMinutes(
            [d],
            entries.filter((e) => e.startsAt.slice(0, 10) === d),
            settings.workHours,
          ) === 0,
      ),
    );
    const presence = monthPresence(
      workingDates,
      vacation,
      metas,
      settings.presenceTracking.targetPct,
      settings.defaultLocation,
      todayISO,
    );
    return {
      workingDates,
      presence,
      suggested: suggestPresenceDays(
        presence,
        settings.presenceTracking.preferredDays,
        dowOf,
      ),
      plannable: new Set(workingDates.filter((d) => d >= todayISO && !vacation.has(d))),
    };
  }, [
    activeDate,
    entries,
    metas,
    todayISO,
    settings.workingDays,
    settings.patronDay,
    settings.workHours,
    settings.presenceTracking.targetPct,
    settings.presenceTracking.preferredDays,
    settings.defaultLocation,
  ]);
}
