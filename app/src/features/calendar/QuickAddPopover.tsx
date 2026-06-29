import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { ActivityTemplate } from "@/data/types";
import { applyDraft, emptyDraft } from "@/domain/entryDraft";
import { applyTemplate } from "@/domain/activityTemplate";
import { minutesToLabel } from "@/domain/slots";
import { entryColor } from "@/domain/colors";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { useTemplateStore } from "@/store/templates";
import { useSettingsStore } from "@/store/settings";
import { useToastStore } from "@/store/toast";
import { Button, cn, Combobox } from "@/ui";

const WIDTH = 340;
const MARGIN = 12;

/** Posizione fissa + lato della freccetta, calcolati dall'ancora. */
function place(anchor: { x: number; y: number } | null) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  if (!anchor) {
    return { left: vw / 2 - WIDTH / 2, top: vh / 3, side: "none" as const };
  }
  let left = anchor.x + 14;
  let side: "left" | "right" = "left";
  if (left + WIDTH > vw - MARGIN) {
    left = anchor.x - 14 - WIDTH;
    side = "right";
  }
  left = Math.max(MARGIN, Math.min(left, vw - WIDTH - MARGIN));
  const top = Math.max(96, Math.min(anchor.y, vh - 96));
  return { left, top, side };
}

/**
 * Quick-add ancorato all'orario: cattura rapida (titolo, fascia, cliente) senza
 * overlay. "Più dettagli" passa all'editor a pagina intera conservando i valori;
 * "Salva" crea subito l'attività. Esc / click-fuori chiudono.
 */
export function QuickAddPopover() {
  const quickAdd = useEditorStore((s) => s.quickAdd);
  const closeQuickAdd = useEditorStore((s) => s.closeQuickAdd);
  const openCreate = useEditorStore((s) => s.openCreate);
  const saveEntry = useCalendarStore((s) => s.saveEntry);
  const undo = useCalendarStore((s) => s.undo);
  const notify = useToastStore((s) => s.notify);
  const clients = useInventoryStore((s) => s.clients);
  const saveClient = useInventoryStore((s) => s.saveClient);
  const templates = useTemplateStore((s) => s.templates);
  const clientColors = useSettingsStore((s) => s.settings.clientColors);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  // Template applicato: porta tipo/progetto/sottotipo (non visibili qui) al salvataggio.
  const [tpl, setTpl] = useState<ActivityTemplate | null>(null);

  // Re-inizializza ad ogni apertura su uno slot; al titolo va il focus, che alla
  // chiusura torna all'elemento di partenza (salvo escalation all'editor, che
  // gestisce il proprio focus).
  useEffect(() => {
    if (!quickAdd) return;
    setTitle("");
    setClientId(null);
    setTpl(null);
    const prevFocus = document.activeElement as HTMLElement | null;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(id);
      if (!useEditorStore.getState().open) prevFocus?.focus?.();
    };
  }, [quickAdd]);

  // Scroll/resize spostano lo slot sotto al popover: l'ancora diventa stale, così
  // chiudiamo invece di lasciarlo "appeso" nel vuoto.
  useEffect(() => {
    if (!quickAdd) return;
    const close = () => closeQuickAdd();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [quickAdd, closeQuickAdd]);

  // Esc chiude.
  useEffect(() => {
    if (!quickAdd) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeQuickAdd();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [quickAdd, closeQuickAdd]);

  // Click fuori chiude.
  useEffect(() => {
    if (!quickAdd) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeQuickAdd();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [quickAdd, closeQuickAdd]);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.name })),
    [clients],
  );
  const selectedClient = clients.find((c) => c.id === clientId) ?? null;
  const dotColor = selectedClient
    ? entryColor(
        { type: "client", clientId: selectedClient.id, subtypeId: null },
        { clientColors, internalColors: {} },
      )
    : null;

  if (!quickAdd) return null;
  const { date, startMin, endMin, anchor } = quickAdd;
  const pos = place(anchor);
  const valid = title.trim() !== "" && endMin > startMin;

  async function createClient(name: string) {
    const id = nanoid();
    await saveClient({ id, name, color: null, createdAt: Date.now() });
    setClientId(id);
  }

  function applyTpl(t: ActivityTemplate) {
    setTpl(t);
    setTitle(t.title);
    setClientId(t.clientId);
    inputRef.current?.focus();
  }

  async function save() {
    if (!valid) return;
    const base = emptyDraft(date, startMin, endMin);
    const draft = {
      ...(tpl ? applyTemplate(base, tpl) : base),
      title,
      clientId,
    };
    await saveEntry(applyDraft(draft, { id: nanoid(), now: Date.now() }));
    closeQuickAdd();
    notify("Attività creata", {
      action: { label: "Annulla", run: () => void undo() },
    });
  }

  function moreDetails() {
    openCreate({
      date,
      startMin,
      endMin,
      title,
      clientId,
      type: tpl?.type,
      projectId: tpl?.projectId,
      subtypeId: tpl?.subtypeId,
    });
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Nuova attività rapida"
      className="animate-modal-in fixed z-modal rounded-xl border border-line bg-surface p-4 shadow-lg"
      style={{
        left: pos.left,
        top: pos.top,
        width: WIDTH,
        transform: "translateY(-50%)",
      }}
    >
      {pos.side !== "none" && (
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-line bg-surface",
            pos.side === "left"
              ? "-left-1.5 border-b border-l"
              : "-right-1.5 border-r border-t",
          )}
        />
      )}

      <input
        ref={inputRef}
        aria-label="Titolo"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
        placeholder="Cosa hai fatto?"
        className={cn(
          "w-full border-b border-line bg-transparent pb-2.5 text-base font-semibold text-ink",
          "placeholder:font-normal placeholder:text-faint focus:border-primary focus:outline-none",
        )}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="tnum inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs text-ink">
          {minutesToLabel(startMin)}
          <span className="text-faint">–</span>
          {minutesToLabel(endMin)}
        </span>
        <div className="min-w-0 flex-1">
          <Combobox
            label="Cliente"
            placeholder="Cliente…"
            options={clientOptions}
            value={clientId}
            onChange={setClientId}
            onCreate={(name) => void createClient(name)}
          />
        </div>
        {dotColor && (
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: dotColor }}
          />
        )}
      </div>

      {templates.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTpl(t)}
              className={cn(
                "inline-flex h-7 max-w-full items-center truncate rounded-pill border px-2.5 text-xs",
                "transition-colors duration-[var(--dur-fast)]",
                tpl?.id === t.id
                  ? "border-primary bg-primary-wash text-accent"
                  : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line pt-3">
        <Button variant="ghost" size="sm" onClick={moreDetails}>
          Più dettagli
          <span aria-hidden className="ml-1">
            ›
          </span>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={closeQuickAdd}>
            Annulla
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!valid}
            onClick={() => void save()}
          >
            Salva
          </Button>
        </div>
      </div>
    </div>
  );
}
