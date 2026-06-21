import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Entry } from "@/data/types";
import { buildSlots, type WorkHours } from "@/domain/slots";
import { entryBlocks } from "@/domain/dayBlocks";
import { conflictsOnDay } from "@/domain/conflict";
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
import { withAlpha } from "@/domain/colors";
import { DayGrid, TIME_GUTTER } from "@/features/calendar/DayGrid";
import { useFitSlotHeight } from "@/features/calendar/useFitSlotHeight";
import { NowLine } from "@/features/calendar/NowLine";

interface DayViewProps {
  date: Date;
  entries: Entry[];
  workHours: WorkHours;
  slotMinutes: number;
  onSelectEntry?: (entry: Entry) => void;
  /** Colore del blocco (per cliente/sottotipo); `null` → accento di default. */
  colorOf?: (entry: Entry) => string | null;
  /** Drag su area vuota → nuova attività in quel giorno/intervallo (minuti). */
  onCreateRange?: (dateISO: string, startMin: number, endMin: number) => void;
  /** Move/resize confermato → nuovo giorno/intervallo dell'entry (minuti). */
  onUpdateEntry?: (
    entry: Entry,
    dateISO: string,
    startMin: number,
    endMin: number,
  ) => void;
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
  colorOf,
  onCreateRange,
  onUpdateEntry,
}: DayViewProps) {
  const slots = buildSlots(workHours, slotMinutes).all;
  const slotCount = slots.length;
  const dayKey = isoDate(date);
  const blocks = entryBlocks(entries, dayKey, slots);

  const areaRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [drag, setDrag] = useState<Drag>(null);
  const { ref: wrapRef, slotHeight } = useFitSlotHeight<HTMLDivElement>(slotCount);

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
    const row = rowAtOffset(offsetY(e.clientY), slotHeight, slotCount);
    beginDrag(e, { kind: "create", anchorRow: row, row });
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag) return;
    if (drag.kind === "create") {
      const row = rowAtOffset(offsetY(e.clientY), slotHeight, slotCount);
      if (row !== drag.row) setDrag({ ...drag, row });
    } else {
      const d = deltaRows(e.clientY - startYRef.current, slotHeight);
      if (d !== drag.dRows) setDrag({ ...drag, dRows: d });
    }
  }

  const geomOf = (d: Exclude<Drag, null>) =>
    d.kind === "create" ? createRange(d.anchorRow, d.row) : dragGeom(d, slotCount);

  /** Conflitto del drag corrente (un click puro non è conflitto). */
  function isConflict(d: Exclude<Drag, null>): boolean {
    if (d.kind === "move" && d.dRows === 0) return false;
    const g = geomOf(d);
    const { startMin, endMin } = rowsToRange(g.startRow, g.span, slots, slotMinutes);
    const ignoreId = d.kind === "create" ? null : d.id;
    return conflictsOnDay(dayKey, startMin, endMin, entries, ignoreId);
  }

  function onPointerUp() {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (d.kind === "move" && d.dRows === 0) {
      const entry = entries.find((x) => x.id === d.id);
      if (entry) onSelectEntry?.(entry); // niente movimento → è un click
      return;
    }
    if (isConflict(d)) return; // sovrapposizione: azione annullata
    const g = geomOf(d);
    const { startMin, endMin } = rowsToRange(g.startRow, g.span, slots, slotMinutes);
    if (d.kind === "create") {
      onCreateRange?.(dayKey, startMin, endMin);
    } else {
      const entry = entries.find((x) => x.id === d.id);
      if (entry) onUpdateEntry?.(entry, dayKey, startMin, endMin);
    }
  }

  const ghost = drag?.kind === "create" ? createRange(drag.anchorRow, drag.row) : null;
  const dragConflict = drag ? isConflict(drag) : false;

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden">
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
        {dayKey === isoDate(new Date()) && (
          <NowLine
            slots={slots}
            slotMinutes={slotMinutes}
            slotHeight={slotHeight}
            withDot
          />
        )}
        {ghost && (
          <div
            data-testid="create-ghost"
            data-conflict={dragConflict}
            style={{
              position: "absolute",
              top: ghost.startRow * slotHeight + 2,
              height: ghost.span * slotHeight - 4,
              left: 4,
              right: 4,
            }}
            className={`pointer-events-none rounded-lg border bg-primary-wash ${
              dragConflict ? "border-danger" : "border-dashed border-primary"
            }`}
          />
        )}

        {blocks.map((b) => {
          const active = drag && drag.kind !== "create" && drag.id === b.entry.id;
          const live = active
            ? dragGeom(drag, slotCount)
            : { startRow: b.startRow, span: b.span };
          const color = colorOf?.(b.entry) ?? null;
          const heightPx = live.span * slotHeight - 4;
          // Blocchi bassi (~30 min): titolo e orario stanno su una riga sola,
          // altrimenti due righe impilate non ci stanno e il titolo viene tagliato.
          const compact = heightPx < 44;
          const time = `${b.entry.startsAt.slice(11, 16)}–${b.entry.endsAt.slice(11, 16)}`;
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
                top: live.startRow * slotHeight + 2,
                height: heightPx,
                left: 4,
                right: 4,
                backgroundColor: color ? withAlpha(color, 0.16) : undefined,
              }}
              className={`group relative flex touch-none overflow-hidden rounded-lg bg-primary-wash pl-3.5 pr-2 text-left text-xs font-medium text-ink shadow-sm transition-[box-shadow,transform] duration-[var(--dur-fast)] ease-out animate-block-in hover:shadow ${
                compact
                  ? "items-baseline gap-2 py-1"
                  : "flex-col gap-0.5 py-1.5"
              } ${active && dragConflict ? "ring-2 ring-danger" : ""}`}
            >
              <span
                aria-hidden
                style={{ backgroundColor: color ?? undefined }}
                className="absolute inset-y-1.5 left-1.5 w-1 rounded-pill bg-accent"
              />
              <span
                className={`min-w-0 truncate leading-tight ${
                  compact ? "flex-1" : ""
                }`}
              >
                {b.entry.title}
              </span>
              <span
                className={`tnum truncate font-mono text-[10px] font-normal text-muted ${
                  compact ? "shrink-0" : ""
                }`}
              >
                {time}
              </span>
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
