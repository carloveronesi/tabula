import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Entry, Location } from "@/data/types";
import { ContextMenu } from "@/ui";
import { DayLocationPicker } from "@/features/calendar/DayLocationPicker";
import { workWeekDays, dowMon0, isoDate, isPatronDay } from "@/domain/calendarNav";
import { buildSlots, minutesToLabel, type WorkHours } from "@/domain/slots";
import { entryBlocks } from "@/domain/dayBlocks";
import { conflictsOnDay } from "@/domain/conflict";
import { withAlpha } from "@/domain/colors";
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
import { TIME_GUTTER } from "@/features/calendar/DayGrid";
import { useFitSlotHeight } from "@/features/calendar/useFitSlotHeight";
import { NowLine } from "@/features/calendar/NowLine";

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
  /** Colore del blocco (per cliente/sottotipo); `null` → accento di default. */
  colorOf?: (entry: Entry) => string | null;
  onCreateRange?: (dateISO: string, startMin: number, endMin: number) => void;
  onUpdateEntry?: (
    entry: Entry,
    dateISO: string,
    startMin: number,
    endMin: number,
  ) => void;
  /** Appunti pieni: abilita il menu "Incolla qui" sull'area vuota. */
  canPaste?: boolean;
  /** Incolla nel giorno/slot indicato (click destro su area vuota). */
  onPasteAt?: (dateISO: string, startMin: number) => void;
  /** Mostra il selettore sede nelle intestazioni (presenze attive). */
  presenceEnabled?: boolean;
  /** Sede per data (giorni con sede registrata). */
  locations?: Record<string, Location>;
  onSetLocation?: (dateISO: string, location: Location | null) => void;
  /** Sede predefinita, suggerita nei giorni senza sede. */
  suggestedLocation?: Location | null;
  /** Giorno del patrono ("MM-GG"): reso come festivo. */
  patronDay?: string;
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
  colorOf,
  onCreateRange,
  onUpdateEntry,
  canPaste = false,
  onPasteAt,
  presenceEnabled = false,
  locations,
  onSetLocation,
  suggestedLocation = null,
  patronDay = "",
}: WeekGridProps) {
  const days = workWeekDays(date, workingDays);
  const todayKey = isoDate(new Date());
  const slots = buildSlots(workHours, slotMinutes).all;
  const slotCount = slots.length;
  const colCount = days.length;

  const colsRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [menuAt, setMenuAt] = useState<{
    x: number;
    y: number;
    date: string;
    startMin: number;
  } | null>(null);
  const { ref: wrapRef, slotHeight } = useFitSlotHeight<HTMLDivElement>(slotCount);

  const colsRect = () => colsRef.current?.getBoundingClientRect();
  const offsetY = (clientY: number) => clientY - (colsRect()?.top ?? 0);

  function begin(e: ReactPointerEvent, next: Drag) {
    startYRef.current = e.clientY;
    colsRef.current?.setPointerCapture?.(e.pointerId);
    setDrag(next);
  }

  function onColumnPointerDown(e: ReactPointerEvent, col: number) {
    if (e.target !== e.currentTarget) return; // su un blocco: lo gestisce il blocco
    const row = rowAtOffset(offsetY(e.clientY), slotHeight, slotCount);
    begin(e, { kind: "create", col, anchorRow: row, row });
  }

  function onColumnContextMenu(e: ReactMouseEvent, col: number) {
    // Solo su area vuota e con qualcosa da incollare; altrimenti menu nativo.
    if (e.target !== e.currentTarget || !canPaste || !onPasteAt) return;
    e.preventDefault();
    const row = rowAtOffset(offsetY(e.clientY), slotHeight, slotCount);
    const { startMin } = rowsToRange(row, 1, slots, slotMinutes);
    setMenuAt({ x: e.clientX, y: e.clientY, date: isoDate(days[col]), startMin });
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag) return;
    if (drag.kind === "create") {
      const row = rowAtOffset(offsetY(e.clientY), slotHeight, slotCount);
      if (row !== drag.row) setDrag({ ...drag, row });
      return;
    }
    const dRows = deltaRows(e.clientY - startYRef.current, slotHeight);
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

  const colOf = (d: Drag) => (d.kind === "move" ? d.targetCol : d.col);
  const geomOf = (d: Drag) =>
    d.kind === "create" ? createRange(d.anchorRow, d.row) : vGeom(d, slotCount);

  /** Conflitto del drag corrente nel giorno di destinazione (click puro escluso). */
  function isConflict(d: Drag): boolean {
    if (d.kind === "move" && d.dRows === 0 && d.targetCol === d.col) return false;
    const g = geomOf(d);
    const { startMin, endMin } = rowsToRange(g.startRow, g.span, slots, slotMinutes);
    const ignoreId = d.kind === "create" ? null : d.id;
    return conflictsOnDay(isoDate(days[colOf(d)]), startMin, endMin, entries, ignoreId);
  }

  function onPointerUp() {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (d.kind === "move" && d.dRows === 0 && d.targetCol === d.col) {
      const entry = entries.find((x) => x.id === d.id);
      if (entry) onSelectEntry?.(entry); // click puro
      return;
    }
    if (isConflict(d)) return; // sovrapposizione: azione annullata
    const g = geomOf(d);
    const { startMin, endMin } = rowsToRange(g.startRow, g.span, slots, slotMinutes);
    const dayKey = isoDate(days[colOf(d)]);
    if (d.kind === "create") {
      onCreateRange?.(dayKey, startMin, endMin);
    } else {
      const entry = entries.find((x) => x.id === d.id);
      if (entry) onUpdateEntry?.(entry, dayKey, startMin, endMin);
    }
  }

  // Anteprima del drag (ghost/creazione o blocco in movimento).
  const dragConflict = drag ? isConflict(drag) : false;
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="row" className="flex border-b border-line">
        <span className="shrink-0" style={{ width: TIME_GUTTER }} />
        {days.map((d) => {
          const today = isoDate(d) === todayKey;
          const holiday = dowMon0(d) >= 5 || isPatronDay(d, patronDay);
          const key = isoDate(d);
          return (
            <div
              key={d.toISOString()}
              role="columnheader"
              className="flex flex-1 flex-col items-start gap-1.5 px-2 py-2.5"
            >
              <span
                className={`text-xs font-semibold ${
                  today ? "text-accent" : holiday ? "text-faint" : "text-muted"
                }`}
              >
                {dayLabel(d)}
              </span>
              {presenceEnabled && onSetLocation && (
                <DayLocationPicker
                  variant="compact"
                  dayLabel={dayLabel(d)}
                  value={locations?.[key] ?? null}
                  suggested={suggestedLocation}
                  onChange={(loc) => onSetLocation(key, loc)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div ref={wrapRef} className="flex min-h-0 flex-1 overflow-hidden">
        <ul className="flex shrink-0 flex-col" style={{ width: TIME_GUTTER }}>
          {slots.map((minutes) => {
            const onHalf = minutes % 30 === 0;
            return (
              <li
                key={minutes}
                className={`relative min-h-[14px] flex-1 border-t ${
                  onHalf ? "border-line" : "border-transparent"
                }`}
              >
                {onHalf && (
                  <span className="tnum absolute -top-2 right-2 font-mono text-xs text-muted">
                    {minutesToLabel(minutes)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div
          ref={colsRef}
          data-testid="week-cols"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative flex h-full flex-1 touch-none"
        >
          {days.map((d, col) => (
            <div
              key={d.toISOString()}
              data-testid={`week-col-${col}`}
              onPointerDown={(e) => onColumnPointerDown(e, col)}
              onContextMenu={(e) => onColumnContextMenu(e, col)}
              className={`relative flex flex-1 flex-col border-l border-line ${
                isoDate(d) === todayKey
                  ? "bg-primary-wash"
                  : dowMon0(d) >= 5 || isPatronDay(d, patronDay)
                    ? "bg-weekend"
                    : ""
              }`}
            >
              {slots.map((minutes) => (
                <div
                  key={minutes}
                  className={`pointer-events-none min-h-[14px] flex-1 border-t ${
                    minutes % 30 === 0 ? "border-line" : "border-transparent"
                  }`}
                />
              ))}
              {isoDate(d) === todayKey && (
                <NowLine
                  slots={slots}
                  slotMinutes={slotMinutes}
                  slotHeight={slotHeight}
                />
              )}
              {entryBlocks(entries, isoDate(d), slots).map((b) => {
                if (drag && drag.kind !== "create" && drag.id === b.entry.id)
                  return null; // mostrato nell'anteprima
                const color = colorOf?.(b.entry) ?? null;
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
                      top: b.startRow * slotHeight + 1,
                      height: b.span * slotHeight - 2,
                      left: 2,
                      right: 2,
                      backgroundColor: color ? withAlpha(color, 0.16) : undefined,
                    }}
                    className="relative flex touch-none overflow-hidden rounded-lg bg-primary-wash py-0.5 pl-2.5 pr-1.5 text-left text-[11px] font-medium leading-tight text-ink shadow-sm transition-[box-shadow] duration-[var(--dur-fast)] ease-out animate-block-in hover:shadow"
                  >
                    <span
                      aria-hidden
                      style={{ backgroundColor: color ?? undefined }}
                      className="absolute inset-y-1 left-1 w-0.5 rounded-pill bg-accent"
                    />
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
              data-conflict={dragConflict}
              className={`pointer-events-none absolute rounded-lg bg-primary-wash ${
                dragConflict
                  ? "border border-danger ring-1 ring-danger"
                  : preview.ghost
                    ? "border border-dashed border-primary"
                    : "shadow"
              }`}
              style={{
                left: `calc(${(preview.col / colCount) * 100}% + 2px)`,
                width: `calc(${100 / colCount}% - 4px)`,
                top: preview.startRow * slotHeight + 1,
                height: preview.span * slotHeight - 2,
              }}
            />
          )}
        </div>
      </div>

      <ContextMenu
        at={menuAt ? { x: menuAt.x, y: menuAt.y } : null}
        onClose={() => setMenuAt(null)}
        items={[
          {
            label: "Incolla qui",
            onSelect: () => {
              if (menuAt) onPasteAt?.(menuAt.date, menuAt.startMin);
            },
          },
        ]}
      />
    </div>
  );
}
