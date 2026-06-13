import type { Entry } from "@/data/types";
import {
  buildSlots,
  entryRowSpan,
  minutesOfDay,
  type WorkHours,
} from "@/domain/slots";
import { isoDate } from "@/domain/calendarNav";
import { DayGrid, SLOT_HEIGHT, TIME_GUTTER } from "@/features/calendar/DayGrid";

interface DayViewProps {
  date: Date;
  entries: Entry[];
  workHours: WorkHours;
  slotMinutes: number;
  onSelectEntry?: (entry: Entry) => void;
}

/**
 * Vista Giorno: griglia oraria + blocchi-evento posizionati per range.
 * Presentazionale: riceve le entry, non legge dal DB.
 */
export function DayView({
  date,
  entries,
  workHours,
  slotMinutes,
  onSelectEntry,
}: DayViewProps) {
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
      <div
        className="pointer-events-none absolute inset-y-0 right-0"
        style={{ left: TIME_GUTTER }}
      >
        {blocks.map(({ entry, pos }) => (
          <button
            key={entry.id}
            type="button"
            data-testid="entry-block"
            data-start-row={pos.startRow}
            data-span={pos.span}
            onClick={() => onSelectEntry?.(entry)}
            style={{
              position: "absolute",
              top: pos.startRow * SLOT_HEIGHT + 2,
              height: pos.span * SLOT_HEIGHT - 4,
              left: 4,
              right: 4,
            }}
            className="pointer-events-auto flex flex-col overflow-hidden rounded bg-primary-wash px-2 py-1 text-left text-xs font-medium text-ink shadow-sm transition duration-[var(--dur-fast)] ease-out hover:brightness-95"
          >
            <span className="truncate">{entry.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
