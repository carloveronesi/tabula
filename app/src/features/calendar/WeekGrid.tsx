import { workWeekDays, dowMon0 } from "@/domain/calendarNav";
import { buildSlots, minutesToLabel, type WorkHours } from "@/domain/slots";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function dayLabel(d: Date): string {
  return `${DAY_NAMES[dowMon0(d)]} ${d.getDate()}`;
}

interface WeekGridProps {
  date: Date;
  workingDays: number[];
  workHours: WorkHours;
  slotMinutes: number;
}

/**
 * Vista Settimana: una colonna per ogni giorno lavorativo (rispetta
 * `workingDays`), più la griglia oraria condivisa. Presentazionale.
 */
export function WeekGrid({ date, workingDays, workHours, slotMinutes }: WeekGridProps) {
  const days = workWeekDays(date, workingDays);
  const slots = buildSlots(workHours, slotMinutes).all;

  return (
    <div>
      <div role="row" className="flex border-b border-[var(--si-border)]">
        <span className="w-12 shrink-0" />
        {days.map((d) => (
          <span
            key={d.toISOString()}
            role="columnheader"
            className="flex-1 px-2 py-1 text-xs font-semibold text-[var(--si-inkSoft)]"
          >
            {dayLabel(d)}
          </span>
        ))}
      </div>
      <ul className="divide-y divide-[var(--si-border)]">
        {slots.map((minutes) => (
          <li key={minutes} className="flex items-start py-1">
            <span className="w-12 shrink-0 font-mono text-xs text-[var(--si-gray)]">
              {minutesToLabel(minutes)}
            </span>
            {days.map((d) => (
              <span key={d.toISOString()} className="flex-1" />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
