import type { Entry } from "@/data/types";
import {
  buildSlots,
  entryRowSpan,
  minutesOfDay,
  type WorkHours,
} from "@/domain/slots";
import { isoDate } from "@/domain/calendarNav";
import { DayGrid } from "@/features/calendar/DayGrid";

interface DayViewProps {
  date: Date;
  entries: Entry[];
  workHours: WorkHours;
  slotMinutes: number;
}

/**
 * Vista Giorno: griglia oraria + blocchi-evento posizionati per range.
 * Presentazionale: riceve le entry, non legge dal DB.
 */
export function DayView({ date, entries, workHours, slotMinutes }: DayViewProps) {
  const slots = buildSlots(workHours, slotMinutes).all;
  const dayKey = isoDate(date);

  const blocks = entries
    .filter((e) => e.startsAt.slice(0, 10) === dayKey)
    .map((e) => ({
      entry: e,
      pos: entryRowSpan(minutesOfDay(e.startsAt), minutesOfDay(e.endsAt), slots),
    }))
    .filter((b): b is { entry: Entry; pos: { startRow: number; span: number } } =>
      b.pos !== null,
    );

  return (
    <div className="relative">
      <DayGrid workHours={workHours} slotMinutes={slotMinutes} />
      <div className="pointer-events-none absolute inset-0">
        {blocks.map(({ entry, pos }) => (
          <div
            key={entry.id}
            data-testid="entry-block"
            data-start-row={pos.startRow}
            data-span={pos.span}
            className="pointer-events-auto rounded bg-primary-wash px-2 py-0.5 text-xs font-medium text-ink shadow-sm"
          >
            {entry.title}
          </div>
        ))}
      </div>
    </div>
  );
}
