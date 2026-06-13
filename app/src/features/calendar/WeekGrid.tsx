import type { Entry } from "@/data/types";
import { workWeekDays, dowMon0, isoDate } from "@/domain/calendarNav";
import { buildSlots, minutesToLabel, type WorkHours } from "@/domain/slots";
import { entryBlocks } from "@/domain/dayBlocks";
import { SLOT_HEIGHT, TIME_GUTTER } from "@/features/calendar/DayGrid";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function dayLabel(d: Date): string {
  return `${DAY_NAMES[dowMon0(d)]} ${d.getDate()}`;
}

interface WeekGridProps {
  date: Date;
  workingDays: number[];
  workHours: WorkHours;
  slotMinutes: number;
  entries?: Entry[];
  onSelectEntry?: (entry: Entry) => void;
}

/**
 * Vista Settimana: una colonna per ogni giorno lavorativo (rispetta
 * `workingDays`), griglia oraria condivisa e blocchi-evento posizionati per
 * range. Stesso sistema di coordinate (SLOT_HEIGHT/TIME_GUTTER) di DayView.
 */
export function WeekGrid({
  date,
  workingDays,
  workHours,
  slotMinutes,
  entries = [],
  onSelectEntry,
}: WeekGridProps) {
  const days = workWeekDays(date, workingDays);
  const slots = buildSlots(workHours, slotMinutes).all;

  return (
    <div>
      <div role="row" className="flex border-b border-line">
        <span className="shrink-0" style={{ width: TIME_GUTTER }} />
        {days.map((d) => (
          <span
            key={d.toISOString()}
            role="columnheader"
            className="flex-1 px-2 py-1 text-xs font-semibold text-muted"
          >
            {dayLabel(d)}
          </span>
        ))}
      </div>

      <div className="flex">
        {/* Gutter delle ore: una riga (listitem) per slot. */}
        <ul className="shrink-0" style={{ width: TIME_GUTTER }}>
          {slots.map((minutes) => (
            <li
              key={minutes}
              className="relative border-t border-line"
              style={{ height: SLOT_HEIGHT }}
            >
              <span className="tnum absolute -top-2 right-2 font-mono text-xs text-muted">
                {minutesToLabel(minutes)}
              </span>
            </li>
          ))}
        </ul>

        {/* Colonne dei giorni con i blocchi posizionati. */}
        <div className="flex flex-1">
          {days.map((d) => {
            const blocks = entryBlocks(entries, isoDate(d), slots);
            return (
              <div
                key={d.toISOString()}
                className="relative flex-1 border-l border-line"
              >
                {slots.map((minutes) => (
                  <div
                    key={minutes}
                    className="border-t border-line"
                    style={{ height: SLOT_HEIGHT }}
                  />
                ))}
                <div className="absolute inset-0">
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
                        top: startRow * SLOT_HEIGHT + 1,
                        height: span * SLOT_HEIGHT - 2,
                        left: 2,
                        right: 2,
                      }}
                      className="flex overflow-hidden rounded bg-primary-wash px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight text-ink shadow-sm transition duration-[var(--dur-fast)] ease-out hover:brightness-95"
                    >
                      <span className="line-clamp-2">{entry.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
