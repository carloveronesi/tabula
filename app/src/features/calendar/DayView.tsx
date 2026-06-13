import type { Entry } from "@/data/types";
import { buildSlots, type WorkHours } from "@/domain/slots";
import { entryBlocks } from "@/domain/dayBlocks";
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
  const blocks = entryBlocks(entries, isoDate(date), slots);

  return (
    <div className="relative">
      <DayGrid workHours={workHours} slotMinutes={slotMinutes} />
      <div
        className="pointer-events-none absolute inset-y-0 right-0"
        style={{ left: TIME_GUTTER }}
      >
        {blocks.map(({ entry, startRow, span }) => (
          <button
            key={entry.id}
            type="button"
            data-testid="entry-block"
            data-start-row={startRow}
            data-span={span}
            onClick={() => onSelectEntry?.(entry)}
            style={{
              position: "absolute",
              top: startRow * SLOT_HEIGHT + 2,
              height: span * SLOT_HEIGHT - 4,
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
