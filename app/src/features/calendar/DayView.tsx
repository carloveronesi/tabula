import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Entry } from "@/data/types";
import { buildSlots, type WorkHours } from "@/domain/slots";
import { entryBlocks } from "@/domain/dayBlocks";
import {
  rowAtOffset,
  deltaRows,
  createRange,
  moveBlock,
  resizeTop,
  resizeBottom,
  rowsToRange,
} from "@/domain/dragGrid";
import { isoDate } from "@/domain/calendarNav";
import { DayGrid, SLOT_HEIGHT, TIME_GUTTER } from "@/features/calendar/DayGrid";

interface DayViewProps {
  date: Date;
  entries: Entry[];
  workHours: WorkHours;
  slotMinutes: number;
  onSelectEntry?: (entry: Entry) => void;
  /** Drag su area vuota → nuova attività su questo intervallo (minuti). */
  onCreateRange?: (startMin: number, endMin: number) => void;
  /** Move/resize confermato → nuovo intervallo dell'entry (minuti). */
  onUpdateEntry?: (entry: Entry, startMin: number, endMin: number) => void;
}

type Drag =
  | { kind: "create"; anchorRow: number; row: number }
  | {
      kind: "move" | "resize-top" | "resize-bottom";
      id: string;
      startRow: number;
      span: number;
      dRows: number;
    }
  | null;

/** Geometria (startRow/span) corrente di un drag move/resize. */
function dragGeom(
  drag: Exclude<Drag, null | { kind: "create" }>,
  slotCount: number,
): { startRow: number; span: number } {
  if (drag.kind === "move") {
    return {
      startRow: moveBlock(drag.startRow, drag.span, drag.dRows, slotCount),
      span: drag.span,
    };
  }
  if (drag.kind === "resize-top") {
    return resizeTop(drag.startRow, drag.span, drag.dRows);
  }
  return resizeBottom(drag.startRow, drag.span, drag.dRows, slotCount);
}

/**
 * Vista Giorno: griglia oraria + blocchi-evento posizionati. Interazioni con
 * Pointer Events (mouse + touch): trascina su area vuota per creare, trascina un
 * blocco per spostarlo, trascina i bordi per ridimensionarlo. Lo snapping vive
 * in `domain/dragGrid` (puro); qui c'è solo l'orchestrazione.
 */
export function DayView({
  date,
  entries,
  workHours,
  slotMinutes,
  onSelectEntry,
  onCreateRange,
  onUpdateEntry,
}: DayViewProps) {
  const slots = buildSlots(workHours, slotMinutes).all;
  const slotCount = slots.length;
  const blocks = entryBlocks(entries, isoDate(date), slots);

  const areaRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [drag, setDrag] = useState<Drag>(null);

  const offsetY = (clientY: number) =>
    clientY - (areaRef.current?.getBoundingClientRect().top ?? 0);

  function beginDrag(e: ReactPointerEvent, next: Drag) {
    startYRef.current = e.clientY;
    // setPointerCapture non c'è in jsdom: optional chaining lo rende innocuo.
    areaRef.current?.setPointerCapture?.(e.pointerId);
    setDrag(next);
  }

  function onAreaPointerDown(e: ReactPointerEvent) {
    if (e.target !== e.currentTarget) return; // su un blocco: lo gestisce il blocco
    const row = rowAtOffset(offsetY(e.clientY), SLOT_HEIGHT, slotCount);
    beginDrag(e, { kind: "create", anchorRow: row, row });
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag) return;
    if (drag.kind === "create") {
      const row = rowAtOffset(offsetY(e.clientY), SLOT_HEIGHT, slotCount);
      if (row !== drag.row) setDrag({ ...drag, row });
    } else {
      const d = deltaRows(e.clientY - startYRef.current, SLOT_HEIGHT);
      if (d !== drag.dRows) setDrag({ ...drag, dRows: d });
    }
  }

  function onPointerUp() {
    if (!drag) return;
    if (drag.kind === "create") {
      const { startRow, span } = createRange(drag.anchorRow, drag.row);
      const { startMin, endMin } = rowsToRange(startRow, span, slots, slotMinutes);
      onCreateRange?.(startMin, endMin);
    } else {
      const entry = entries.find((x) => x.id === drag.id);
      if (entry) {
        if (drag.kind === "move" && drag.dRows === 0) {
          onSelectEntry?.(entry); // niente movimento → è un click
        } else {
          const g = dragGeom(drag, slotCount);
          const { startMin, endMin } = rowsToRange(g.startRow, g.span, slots, slotMinutes);
          onUpdateEntry?.(entry, startMin, endMin);
        }
      }
    }
    setDrag(null);
  }

  const ghost = drag?.kind === "create" ? createRange(drag.anchorRow, drag.row) : null;

  return (
    <div className="relative">
      <DayGrid workHours={workHours} slotMinutes={slotMinutes} />
      <div
        ref={areaRef}
        data-testid="day-area"
        onPointerDown={onAreaPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute inset-y-0 right-0 touch-none"
        style={{ left: TIME_GUTTER }}
      >
        {ghost && (
          <div
            data-testid="create-ghost"
            style={{
              position: "absolute",
              top: ghost.startRow * SLOT_HEIGHT + 2,
              height: ghost.span * SLOT_HEIGHT - 4,
              left: 4,
              right: 4,
            }}
            className="pointer-events-none rounded border border-dashed border-primary bg-primary-wash"
          />
        )}

        {blocks.map((b) => {
          const live =
            drag && drag.kind !== "create" && drag.id === b.entry.id
              ? dragGeom(drag, slotCount)
              : { startRow: b.startRow, span: b.span };
          return (
            <button
              key={b.entry.id}
              type="button"
              data-testid="entry-block"
              data-start-row={b.startRow}
              data-span={b.span}
              onPointerDown={(e) => {
                e.stopPropagation();
                beginDrag(e, {
                  kind: "move",
                  id: b.entry.id,
                  startRow: b.startRow,
                  span: b.span,
                  dRows: 0,
                });
              }}
              style={{
                position: "absolute",
                top: live.startRow * SLOT_HEIGHT + 2,
                height: live.span * SLOT_HEIGHT - 4,
                left: 4,
                right: 4,
              }}
              className="group flex touch-none flex-col overflow-hidden rounded bg-primary-wash px-2 py-1 text-left text-xs font-medium text-ink shadow-sm transition-[filter] duration-[var(--dur-fast)] ease-out hover:brightness-95"
            >
              <span className="truncate">{b.entry.title}</span>
              <span
                data-testid="resize-top"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  beginDrag(e, {
                    kind: "resize-top",
                    id: b.entry.id,
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
                  beginDrag(e, {
                    kind: "resize-bottom",
                    id: b.entry.id,
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
    </div>
  );
}
