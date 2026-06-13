import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Entry } from "@/data/types";
import { workWeekDays, dowMon0, isoDate } from "@/domain/calendarNav";
import { buildSlots, minutesToLabel, type WorkHours } from "@/domain/slots";
import { entryBlocks } from "@/domain/dayBlocks";
import {
  rowAtOffset,
  columnAtOffset,
  deltaRows,
  createRange,
  moveBlock,
  resizeTop,
  resizeBottom,
  rowsToRange,
} from "@/domain/dragGrid";
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
  onCreateRange?: (dateISO: string, startMin: number, endMin: number) => void;
  onUpdateEntry?: (
    entry: Entry,
    dateISO: string,
    startMin: number,
    endMin: number,
  ) => void;
}

type Drag =
  | { kind: "create"; col: number; anchorRow: number; row: number }
  | {
      kind: "move";
      id: string;
      col: number;
      targetCol: number;
      startRow: number;
      span: number;
      dRows: number;
    }
  | {
      kind: "resize-top" | "resize-bottom";
      id: string;
      col: number;
      startRow: number;
      span: number;
      dRows: number;
    };

function vGeom(
  drag: Extract<Drag, { kind: "move" | "resize-top" | "resize-bottom" }>,
  slotCount: number,
): { startRow: number; span: number } {
  if (drag.kind === "move")
    return {
      startRow: moveBlock(drag.startRow, drag.span, drag.dRows, slotCount),
      span: drag.span,
    };
  if (drag.kind === "resize-top")
    return resizeTop(drag.startRow, drag.span, drag.dRows);
  return resizeBottom(drag.startRow, drag.span, drag.dRows, slotCount);
}

/**
 * Vista Settimana: una colonna per giorno lavorativo, griglia condivisa e
 * blocchi posizionati. Interazioni Pointer Events: trascina area vuota → nuova
 * attività in quel giorno; trascina un blocco → spostalo nel tempo e tra i
 * giorni (colonne); trascina i bordi → ridimensiona; click → dettaglio.
 */
export function WeekGrid({
  date,
  workingDays,
  workHours,
  slotMinutes,
  entries = [],
  onSelectEntry,
  onCreateRange,
  onUpdateEntry,
}: WeekGridProps) {
  const days = workWeekDays(date, workingDays);
  const slots = buildSlots(workHours, slotMinutes).all;
  const slotCount = slots.length;
  const colCount = days.length;

  const colsRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [drag, setDrag] = useState<Drag | null>(null);

  const colsRect = () => colsRef.current?.getBoundingClientRect();
  const offsetY = (clientY: number) => clientY - (colsRect()?.top ?? 0);

  function begin(e: ReactPointerEvent, next: Drag) {
    startYRef.current = e.clientY;
    colsRef.current?.setPointerCapture?.(e.pointerId);
    setDrag(next);
  }

  function onColumnPointerDown(e: ReactPointerEvent, col: number) {
    if (e.target !== e.currentTarget) return; // su un blocco: lo gestisce il blocco
    const row = rowAtOffset(offsetY(e.clientY), SLOT_HEIGHT, slotCount);
    begin(e, { kind: "create", col, anchorRow: row, row });
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag) return;
    if (drag.kind === "create") {
      const row = rowAtOffset(offsetY(e.clientY), SLOT_HEIGHT, slotCount);
      if (row !== drag.row) setDrag({ ...drag, row });
      return;
    }
    const dRows = deltaRows(e.clientY - startYRef.current, SLOT_HEIGHT);
    if (drag.kind === "move") {
      const rect = colsRect();
      const colW = rect ? rect.width / colCount : 0;
      const targetCol =
        colW > 0
          ? columnAtOffset(e.clientX - (rect?.left ?? 0), colW, colCount)
          : drag.col;
      if (dRows !== drag.dRows || targetCol !== drag.targetCol)
        setDrag({ ...drag, dRows, targetCol });
    } else if (dRows !== drag.dRows) {
      setDrag({ ...drag, dRows });
    }
  }

  function onPointerUp() {
    if (!drag) return;
    if (drag.kind === "create") {
      const { startRow, span } = createRange(drag.anchorRow, drag.row);
      const { startMin, endMin } = rowsToRange(startRow, span, slots, slotMinutes);
      onCreateRange?.(isoDate(days[drag.col]), startMin, endMin);
    } else {
      const entry = entries.find((x) => x.id === drag.id);
      if (entry) {
        const targetCol = drag.kind === "move" ? drag.targetCol : drag.col;
        const noMove =
          drag.kind === "move" && drag.dRows === 0 && targetCol === drag.col;
        if (noMove) {
          onSelectEntry?.(entry); // click puro
        } else {
          const g = vGeom(drag, slotCount);
          const { startMin, endMin } = rowsToRange(g.startRow, g.span, slots, slotMinutes);
          onUpdateEntry?.(entry, isoDate(days[targetCol]), startMin, endMin);
        }
      }
    }
    setDrag(null);
  }

  // Anteprima del drag (ghost/creazione o blocco in movimento).
  const preview =
    drag?.kind === "create"
      ? { col: drag.col, ...createRange(drag.anchorRow, drag.row), ghost: true }
      : drag
        ? {
            col: drag.kind === "move" ? drag.targetCol : drag.col,
            ...vGeom(drag, slotCount),
            ghost: false,
          }
        : null;

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

        <div
          ref={colsRef}
          data-testid="week-cols"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative flex flex-1 touch-none"
        >
          {days.map((d, col) => (
            <div
              key={d.toISOString()}
              data-testid={`week-col-${col}`}
              onPointerDown={(e) => onColumnPointerDown(e, col)}
              className="relative flex-1 border-l border-line"
            >
              {slots.map((minutes) => (
                <div
                  key={minutes}
                  className="pointer-events-none border-t border-line"
                  style={{ height: SLOT_HEIGHT }}
                />
              ))}
              {entryBlocks(entries, isoDate(d), slots).map((b) => {
                if (drag && drag.kind !== "create" && drag.id === b.entry.id)
                  return null; // mostrato nell'anteprima
                return (
                  <button
                    key={b.entry.id}
                    type="button"
                    data-testid="entry-block"
                    data-start-row={b.startRow}
                    data-span={b.span}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      begin(e, {
                        kind: "move",
                        id: b.entry.id,
                        col,
                        targetCol: col,
                        startRow: b.startRow,
                        span: b.span,
                        dRows: 0,
                      });
                    }}
                    style={{
                      position: "absolute",
                      top: b.startRow * SLOT_HEIGHT + 1,
                      height: b.span * SLOT_HEIGHT - 2,
                      left: 2,
                      right: 2,
                    }}
                    className="flex touch-none overflow-hidden rounded bg-primary-wash px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight text-ink shadow-sm transition-[filter] duration-[var(--dur-fast)] ease-out hover:brightness-95"
                  >
                    <span className="line-clamp-2">{b.entry.title}</span>
                    <span
                      data-testid="resize-top"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        begin(e, {
                          kind: "resize-top",
                          id: b.entry.id,
                          col,
                          startRow: b.startRow,
                          span: b.span,
                          dRows: 0,
                        });
                      }}
                      className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
                    />
                    <span
                      data-testid="resize-bottom"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        begin(e, {
                          kind: "resize-bottom",
                          id: b.entry.id,
                          col,
                          startRow: b.startRow,
                          span: b.span,
                          dRows: 0,
                        });
                      }}
                      className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                    />
                  </button>
                );
              })}
            </div>
          ))}

          {preview && (
            <div
              data-testid={preview.ghost ? "create-ghost" : "drag-preview"}
              className={
                preview.ghost
                  ? "pointer-events-none absolute rounded border border-dashed border-primary bg-primary-wash"
                  : "pointer-events-none absolute rounded bg-primary-wash shadow"
              }
              style={{
                left: `calc(${(preview.col / colCount) * 100}% + 2px)`,
                width: `calc(${100 / colCount}% - 4px)`,
                top: preview.startRow * SLOT_HEIGHT + 1,
                height: preview.span * SLOT_HEIGHT - 2,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
