import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Entry } from "@/data/types";
import { ContextMenu } from "@/ui";
import {
  buildSlots,
  entryRowSpan,
  lunchBoundary,
  minutesToLabel,
  type WorkHours,
} from "@/domain/slots";
import type { PreviewBlock } from "@/features/calendar/import/importPreviewStore";
import { entryBlocks } from "@/domain/dayBlocks";
import { conflictsOnDay } from "@/domain/conflict";
import {
  rowAtOffset,
  rowTop,
  LUNCH_BAND,
  deltaRows,
  createRange,
  clampCreateToSide,
  moveBlock,
  resizeTop,
  resizeBottom,
  rowsToRange,
} from "@/domain/dragGrid";
import { isoDate } from "@/domain/calendarNav";
import { withAlpha } from "@/domain/colors";
import { DayGrid, TIME_GUTTER, GRID_PAD_TOP, GRID_PAD_BOTTOM } from "@/features/calendar/DayGrid";
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
  /** Etichetta cliente/sottotipo del blocco; `null` → solo l'orario. */
  labelOf?: (entry: Entry) => string | null;
  /** Drag su area vuota → nuova attività in quel giorno/intervallo (minuti). */
  onCreateRange?: (
    dateISO: string,
    startMin: number,
    endMin: number,
    anchor?: { x: number; y: number },
  ) => void;
  /** Move/resize confermato → nuovo giorno/intervallo dell'entry (minuti). */
  onUpdateEntry?: (
    entry: Entry,
    dateISO: string,
    startMin: number,
    endMin: number,
  ) => void;
  /** Appunti pieni: abilita il menu "Incolla qui" sull'area vuota. */
  canPaste?: boolean;
  /** Incolla nello slot indicato (click destro su area vuota). */
  onPasteAt?: (dateISO: string, startMin: number) => void;
  /** Copia l'attività (voce del menu contestuale sul blocco). */
  onCopyEntry?: (entry: Entry) => void;
  /** Duplica l'attività nel primo slot libero della giornata. */
  onDuplicateEntry?: (entry: Entry) => void;
  /** Salva l'attività come template riusabile. */
  onSaveTemplate?: (entry: Entry) => void;
  /** Elimina l'attività. */
  onDeleteEntry?: (entry: Entry) => void;
  /** Blocchi-anteprima dell'import: fantasmi read-only sulla griglia. */
  previewBlocks?: PreviewBlock[];
}

/** Menu contestuale: incolla su area vuota, oppure azioni su un'attività. */
type Menu =
  | { x: number; y: number; kind: "paste"; startMin: number }
  | { x: number; y: number; kind: "entry"; entry: Entry };

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
  boundary: number | null,
): { startRow: number; span: number } {
  if (drag.kind === "move") {
    return {
      startRow: moveBlock(drag.startRow, drag.span, drag.dRows, slotCount, boundary),
      span: drag.span,
    };
  }
  if (drag.kind === "resize-top") {
    return resizeTop(drag.startRow, drag.span, drag.dRows, boundary);
  }
  return resizeBottom(drag.startRow, drag.span, drag.dRows, slotCount, boundary);
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
  labelOf,
  onCreateRange,
  onUpdateEntry,
  canPaste = false,
  onPasteAt,
  onCopyEntry,
  onDuplicateEntry,
  onSaveTemplate,
  onDeleteEntry,
  previewBlocks,
}: DayViewProps) {
  const slots = buildSlots(workHours, slotMinutes).all;
  const slotCount = slots.length;
  const boundary = lunchBoundary(workHours, slotMinutes);
  const dayKey = isoDate(date);
  const blocks = entryBlocks(entries, dayKey, slots);

  const areaRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [drag, setDrag] = useState<Drag>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const hasEntryMenu = !!(onCopyEntry || onDuplicateEntry || onDeleteEntry);
  const { ref: wrapRef, slotHeight } = useFitSlotHeight<HTMLDivElement>(
    slotCount,
    (boundary !== null ? LUNCH_BAND : 0) + GRID_PAD_TOP + GRID_PAD_BOTTOM,
  );

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
    const row = rowAtOffset(offsetY(e.clientY), slotHeight, slotCount, boundary);
    beginDrag(e, { kind: "create", anchorRow: row, row });
  }

  function onAreaContextMenu(e: ReactMouseEvent) {
    // Solo su area vuota e con qualcosa da incollare; altrimenti menu nativo.
    if (e.target !== e.currentTarget || !canPaste || !onPasteAt) return;
    e.preventDefault();
    const row = rowAtOffset(offsetY(e.clientY), slotHeight, slotCount, boundary);
    const { startMin } = rowsToRange(row, 1, slots, slotMinutes);
    setMenu({ x: e.clientX, y: e.clientY, kind: "paste", startMin });
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag) return;
    if (drag.kind === "create") {
      const row = rowAtOffset(offsetY(e.clientY), slotHeight, slotCount, boundary);
      if (row !== drag.row) setDrag({ ...drag, row });
    } else {
      const d = deltaRows(e.clientY - startYRef.current, slotHeight);
      if (d !== drag.dRows) setDrag({ ...drag, dRows: d });
    }
  }

  const createGeom = (d: Extract<Drag, { kind: "create" }>) => {
    const r = createRange(d.anchorRow, d.row);
    return clampCreateToSide(r.startRow, r.span, d.anchorRow, boundary);
  };
  const geomOf = (d: Exclude<Drag, null>) =>
    d.kind === "create" ? createGeom(d) : dragGeom(d, slotCount, boundary);

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
      // Ancora il quick-add al bordo destro dello slot creato (centro verticale).
      const rect = areaRef.current?.getBoundingClientRect();
      const top = rowTop(g.startRow, slotHeight, boundary);
      const bottom = rowTop(g.startRow + g.span - 1, slotHeight, boundary) + slotHeight;
      const anchor = rect
        ? { x: rect.right, y: rect.top + (top + bottom) / 2 }
        : undefined;
      onCreateRange?.(dayKey, startMin, endMin, anchor);
    } else {
      const entry = entries.find((x) => x.id === d.id);
      if (entry) onUpdateEntry?.(entry, dayKey, startMin, endMin);
    }
  }

  const ghost = drag?.kind === "create" ? createGeom(drag) : null;
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
        onContextMenu={onAreaContextMenu}
        className="absolute bottom-0 right-0 touch-none"
        style={{ left: TIME_GUTTER, top: GRID_PAD_TOP }}
      >
        {dayKey === isoDate(new Date()) && (
          <NowLine
            slots={slots}
            slotMinutes={slotMinutes}
            slotHeight={slotHeight}
            boundary={boundary}
            withDot
          />
        )}
        {ghost && (
          <div
            data-testid="create-ghost"
            data-conflict={dragConflict}
            style={{
              position: "absolute",
              top: rowTop(ghost.startRow, slotHeight, boundary) + 2,
              height: ghost.span * slotHeight - 4,
              left: 4,
              right: 4,
            }}
            className={`pointer-events-none rounded-lg border bg-primary-wash ${
              dragConflict ? "border-danger" : "border-dashed border-primary"
            }`}
          />
        )}

        {blocks.length === 0 && !drag && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
            <p className="text-center text-[13px] text-muted">
              Trascina sulla griglia per creare un'attività
            </p>
          </div>
        )}

        {blocks.map((b) => {
          const active = drag && drag.kind !== "create" && drag.id === b.entry.id;
          const live = active
            ? dragGeom(drag, slotCount, boundary)
            : { startRow: b.startRow, span: b.span };
          const color = colorOf?.(b.entry) ?? null;
          const label = labelOf?.(b.entry) ?? null;
          // Top/altezza via `rowTop`: include la striscia pausa per le entry che
          // la attraversano (dati pregressi), resta `span*slotHeight` per le altre.
          const top = rowTop(live.startRow, slotHeight, boundary);
          const heightPx =
            rowTop(live.startRow + live.span - 1, slotHeight, boundary) + slotHeight - top - 4;
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
                if (e.button !== 0) return; // il destro apre il menu, non trascina
                e.stopPropagation();
                beginDrag(e, {
                  kind: "move",
                  id: b.entry.id,
                  startRow: b.startRow,
                  span: b.span,
                  dRows: 0,
                });
              }}
              onContextMenu={(e) => {
                if (!hasEntryMenu) return; // niente azioni → menu nativo
                e.preventDefault();
                e.stopPropagation();
                setMenu({ x: e.clientX, y: e.clientY, kind: "entry", entry: b.entry });
              }}
              onKeyDown={(e) => {
                // Apertura da tastiera: il drag (apri/sposta) vive sui pointer event.
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectEntry?.(b.entry);
                }
              }}
              style={{
                position: "absolute",
                top: top + 2,
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
              {compact ? (
                <span className="tnum shrink-0 truncate text-[10px] font-normal text-muted">
                  {time}
                </span>
              ) : (
                <span className="flex min-w-0 items-baseline gap-1 text-[10px] font-normal text-muted">
                  {label && (
                    <>
                      <span className="min-w-0 truncate">{label}</span>
                      <span aria-hidden className="shrink-0">
                        ·
                      </span>
                    </>
                  )}
                  <span className="tnum shrink-0">{time}</span>
                </span>
              )}
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
                className="absolute inset-x-0 top-0 flex h-1.5 cursor-ns-resize items-start justify-center"
              >
                <span aria-hidden className="h-0.5 w-5 rounded-pill bg-ink/25 opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100" />
              </span>
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
                className="absolute inset-x-0 bottom-0 flex h-1.5 cursor-ns-resize items-end justify-center"
              >
                <span aria-hidden className="h-0.5 w-5 rounded-pill bg-ink/25 opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100" />
              </span>
            </button>
          );
        })}

        {(previewBlocks ?? []).map((p) => {
          if (p.date !== dayKey) return null;
          const pos = entryRowSpan(p.startMin, p.endMin, slots);
          if (!pos) return null;
          const top = rowTop(pos.startRow, slotHeight, boundary);
          const height =
            rowTop(pos.startRow + pos.span - 1, slotHeight, boundary) +
            slotHeight - top - 4;
          return (
            <div
              key={p.key}
              data-testid="preview-ghost"
              data-conflict={p.conflict}
              style={{ position: "absolute", top: top + 2, height, left: 4, right: 4 }}
              className={`pointer-events-none flex flex-col justify-center overflow-hidden rounded-lg border-2 border-dashed px-3 text-xs font-medium ${
                p.conflict
                  ? "border-danger bg-danger/10 text-danger"
                  : "border-primary bg-primary-wash text-primary"
              }`}
            >
              <span className="truncate leading-tight">{p.label || "Evento"}</span>
              <span className="tnum text-[10px] font-normal opacity-80">
                {minutesToLabel(p.startMin)}–{minutesToLabel(p.endMin)}
              </span>
            </div>
          );
        })}
      </div>

      <ContextMenu
        at={menu ? { x: menu.x, y: menu.y } : null}
        onClose={() => setMenu(null)}
        items={
          menu?.kind === "entry"
            ? [
                { label: "Apri", onSelect: () => onSelectEntry?.(menu.entry) },
                { label: "Copia", onSelect: () => onCopyEntry?.(menu.entry) },
                {
                  label: "Duplica",
                  onSelect: () => onDuplicateEntry?.(menu.entry),
                },
                {
                  label: "Salva come template",
                  onSelect: () => onSaveTemplate?.(menu.entry),
                },
                {
                  label: "Elimina",
                  onSelect: () => onDeleteEntry?.(menu.entry),
                },
              ]
            : [
                {
                  label: "Incolla qui",
                  onSelect: () => {
                    if (menu) onPasteAt?.(dayKey, menu.startMin);
                  },
                },
              ]
        }
      />
    </div>
  );
}
