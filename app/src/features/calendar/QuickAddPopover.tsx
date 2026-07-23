import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { ActivityTemplate, Entry, Id, ISODate } from "@/data/types";
import { applyDraft, emptyDraft } from "@/domain/entryDraft";
import { applyTemplate } from "@/domain/activityTemplate";
import { minutesToLabel } from "@/domain/slots";
import { addDays, isoDate } from "@/domain/calendarNav";
import { parseEntry } from "@/domain/ai/parseEntry";
import { collaboratorCandidateIds } from "@/domain/collaborators";
import { namesInText } from "@/domain/peopleInText";
import { colorFromKey, projectColor } from "@/domain/colors";
import { rankProjectsByUsage } from "@/domain/projectUsage";
import { nameOptions, projectsFor } from "@/domain/pickers";
import { newProject } from "@/domain/projectDraft";
import { allEntries } from "@/data/repositories";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { useTemplateStore } from "@/store/templates";
import { useToastStore } from "@/store/toast";
import { useSettingsStore } from "@/store/settings";
import { Button, cn, Combobox, Icons, Segmented } from "@/ui";

type Mode = "client" | "internal";
const MODES = [
  { id: "client" as const, label: "Cliente" },
  { id: "internal" as const, label: "Interno" },
];

const WIDTH = 340;
const MARGIN = 12;

const dayLabel = (d: ISODate) =>
  new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${d}T00:00:00`));

/** ISODate + scarto in giorni → ISODate (nessuna conversione di fuso). */
const shiftDate = (d: ISODate, days: number): ISODate =>
  isoDate(addDays(new Date(`${d}T00:00:00`), days));

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
  const projects = useInventoryStore((s) => s.projects);
  const saveProject = useInventoryStore((s) => s.saveProject);
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const templates = useTemplateStore((s) => s.templates);
  const ai = useSettingsStore((s) => s.settings.ai);
  const subtypes = useSettingsStore((s) => s.settings.subtypes);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const aiAbort = useRef<AbortController | null>(null);
  const [title, setTitle] = useState("");
  // Il segmento sceglie la classificazione: "client" abilita cliente + progetto
  // del cliente, "internal" abilita il solo progetto interno.
  const [mode, setMode] = useState<Mode>("client");
  const [clientId, setClientId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  // Template applicato: porta tipo/sottotipo (non visibili qui) al salvataggio.
  const [tpl, setTpl] = useState<ActivityTemplate | null>(null);
  // Storico completo, solo per ordinare i progetti per frequenza d'uso.
  // ponytail: scan dell'intera tabella entries a ogni apertura, come l'editor;
  // se pesa, cache in uno store o un indice per progetto.
  const [archive, setArchive] = useState<Entry[]>([]);

  // Data e fascia proposte dall'AI: sovrascrivono lo slot cliccato finché non
  // si ripristina la frase.
  const [override, setOverride] = useState<{
    date: ISODate;
    startMin: number;
    endMin: number;
  } | null>(null);
  // Frase originale: presente ⇒ la proposta è in campo e si può ripristinare.
  const [rawText, setRawText] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // Persone nominate nella frase: qui non hanno un campo, viaggiano fino
  // all'editor dove si vedono e si tolgono.
  const [seedPeople, setSeedPeople] = useState<{
    collaboratorIds: Id[];
    contactIds: Id[];
  }>({ collaboratorIds: [], contactIds: [] });

  // Re-inizializza ad ogni apertura su uno slot; al titolo va il focus, che alla
  // chiusura torna all'elemento di partenza (salvo escalation all'editor, che
  // gestisce il proprio focus).
  useEffect(() => {
    if (!quickAdd) return;
    setTitle("");
    setMode("client");
    setClientId(null);
    setProjectId(null);
    setTpl(null);
    setOverride(null);
    setRawText(null);
    setAiBusy(false);
    setAiError(null);
    setSeedPeople({ collaboratorIds: [], contactIds: [] });
    void allEntries().then(setArchive);
    const prevFocus = document.activeElement as HTMLElement | null;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(id);
      aiAbort.current?.abort();
      if (!useEditorStore.getState().open) prevFocus?.focus?.();
    };
  }, [quickAdd]);

  // Scroll/resize spostano lo slot sotto al popover: l'ancora diventa stale, così
  // chiudiamo invece di lasciarlo "appeso" nel vuoto.
  useEffect(() => {
    if (!quickAdd) return;
    // Chiudi solo se la pagina si sposta davvero (l'ancora diventa stale). Ignora
    // gli scroll spuri che non muovono la finestra: input del titolo che trabocca,
    // lista del cliente, scroll-into-view del focus sul combobox.
    const x0 = window.scrollX;
    const y0 = window.scrollY;
    const onScroll = () => {
      if (window.scrollX !== x0 || window.scrollY !== y0) closeQuickAdd();
    };
    const close = () => closeQuickAdd();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
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

  // Click fuori chiude. In fase di cattura: un click su un elemento che si rimuove
  // da sé (es. l'opzione del dropdown cliente, che chiude la lista) sarebbe già
  // staccato dal DOM nella fase di bubble e verrebbe scambiato per "fuori".
  useEffect(() => {
    if (!quickAdd) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeQuickAdd();
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [quickAdd, closeQuickAdd]);

  const clientOptions = useMemo(() => nameOptions(clients), [clients]);
  // Progetti del cliente scelto (modalità cliente). Vedi projectsFor.
  const clientProjectOptions = useMemo(
    () =>
      nameOptions(
        projectsFor(projects, { kind: "client", clientId, keepId: projectId }),
      ),
    [projects, clientId, projectId],
  );
  // Progetti interni (clientId null), ordinati per frequenza d'uso.
  const internalOptions = useMemo(
    () =>
      nameOptions(
        rankProjectsByUsage(
          projectsFor(projects, {
            kind: "internal",
            clientId: null,
            keepId: projectId,
          }),
          archive,
        ),
      ),
    [projects, projectId, archive],
  );
  const selectedClient = clients.find((c) => c.id === clientId) ?? null;
  const selectedProject = projects.find((p) => p.id === projectId) ?? null;
  // Pallino-indizio della classificazione scelta.
  const dotColor =
    mode === "internal"
      ? (selectedProject ? projectColor(selectedProject) : null)
      : (selectedClient ? colorFromKey(selectedClient.id) : null);

  // Il segmento resetta le selezioni: gli id di una modalità non valgono
  // nell'altra.
  const changeMode = (m: Mode) => {
    setMode(m);
    setClientId(null);
    setProjectId(null);
    setTpl(null);
  };
  // Il progetto dipende dal cliente: cambiando cliente si azzera.
  const pickClient = (id: string | null) => {
    setClientId(id);
    setProjectId(null);
  };

  if (!quickAdd) return null;
  const { anchor } = quickAdd;
  // Data dello slot cliccato: base per lo scarto in giorni proposto dall'AI, così
  // due interpretazioni di fila non si sommano.
  const slotDate = quickAdd.date;
  const date = override?.date ?? quickAdd.date;
  const startMin = override?.startMin ?? quickAdd.startMin;
  const endMin = override?.endMin ?? quickAdd.endMin;
  const pos = place(anchor);
  const valid = title.trim() !== "" && endMin > startMin;
  // Basta del testo: una soglia di parole risparmierebbe qualche chiamata inutile
  // al prezzo di un bottone che appare e sparisce senza una ragione visibile.
  const canInterpret = ai.enabled && !aiBusy && title.trim() !== "";

  async function createClient(name: string) {
    const id = nanoid();
    await saveClient({ id, name, color: null, createdAt: Date.now() });
    pickClient(id);
  }

  // Crea un progetto per la modalità corrente: legato al cliente (modalità
  // cliente) o interno. In modalità cliente serve prima un cliente.
  async function createProject(name: string) {
    if (mode === "client" && !clientId) return;
    const id = nanoid();
    await saveProject(
      newProject({ name, clientId: mode === "client" ? clientId : null }, id),
    );
    setProjectId(id);
  }

  /**
   * Legge la frase e compila i campi. Non tocca niente da solo: parte solo dal
   * bottone o da ⌘/Ctrl+Invio, e quello che propone resta rivedibile.
   * ponytail: il sottotipo proposto viene ignorato — qui non ha un campo, e
   * riempirlo senza mostrarlo sarebbe una modifica invisibile.
   */
  async function interpret() {
    const text = title.trim();
    if (text === "") return;
    aiAbort.current?.abort();
    const ctrl = new AbortController();
    aiAbort.current = ctrl;
    setAiBusy(true);
    setAiError(null);
    try {
      const h = await parseEntry(text, { clients, projects, subtypes }, ai, ctrl.signal);
      if (ctrl.signal.aborted) return;
      const start = h.startMin ?? startMin;
      const dur = h.durationMin ?? endMin - startMin;
      setRawText(text);
      setTitle(h.title);
      setMode(h.kind);
      setClientId(h.clientId);
      setProjectId(h.projectId);
      setTpl(null);
      setOverride({
        date: shiftDate(slotDate, h.dayOffset),
        startMin: start,
        endMin: Math.min(start + dur, 24 * 60),
      });
      // I nomi si cercano in codice, fra le sole persone legate al progetto
      // riconosciuto: sono pochi e sono nomi propri, non serve chiederlo al
      // modello — né mandargli la rubrica.
      const team = collaboratorCandidateIds(projects, h.projectId, h.clientId);
      setSeedPeople({
        collaboratorIds: namesInText(
          text,
          people.filter((p) => team.includes(p.id)),
        ),
        contactIds: namesInText(
          text,
          contacts.filter((k) => k.clientId === h.clientId),
        ),
      });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setAiError(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      if (!ctrl.signal.aborted) setAiBusy(false);
    }
  }

  /** Rimette la frase e annulla tutto quello che l'AI aveva compilato. */
  function restoreText() {
    if (rawText === null) return;
    setTitle(rawText);
    setRawText(null);
    setOverride(null);
    setClientId(null);
    setProjectId(null);
    setMode("client");
    setAiError(null);
    setSeedPeople({ collaboratorIds: [], contactIds: [] });
  }

  function applyTpl(t: ActivityTemplate) {
    setTpl(t);
    setTitle(t.title);
    // Le sole classificazioni con selettori qui sono cliente/interno; ferie ed
    // eventi passano al salvataggio via il tipo del template.
    setMode(t.type === "internal" ? "internal" : "client");
    setClientId(t.type === "internal" ? null : t.clientId);
    setProjectId(t.projectId);
    inputRef.current?.focus();
  }

  // Un template ferie/evento porta un tipo senza selettore qui: al salvataggio
  // vince il tipo del template.
  const specialTpl =
    tpl && tpl.type !== "client" && tpl.type !== "internal" ? tpl : null;

  async function save() {
    if (!valid) return;
    const base = emptyDraft(date, startMin, endMin);
    const t = tpl ? applyTemplate(base, tpl) : base;
    const draft = specialTpl
      ? { ...t, title }
      : mode === "internal"
        ? { ...t, type: "internal" as const, clientId: null, projectId, title }
        : { ...t, type: "client" as const, clientId, projectId, title };
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
      type: specialTpl ? specialTpl.type : mode,
      clientId: mode === "client" && !specialTpl ? clientId : null,
      projectId: specialTpl ? specialTpl.projectId : projectId,
      subtypeId: tpl?.subtypeId,
      ...seedPeople,
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
          if (e.key !== "Enter") return;
          e.preventDefault();
          // ⌘/Ctrl+Invio interpreta, Invio salva come sempre: chi non usa l'AI
          // non incontra un comportamento diverso da prima.
          if ((e.metaKey || e.ctrlKey) && canInterpret) void interpret();
          else void save();
        }}
        placeholder="Cosa hai fatto?"
        className={cn(
          "w-full border-b border-line bg-transparent pb-2.5 text-base font-semibold text-ink",
          "placeholder:font-normal placeholder:text-faint focus:border-primary focus:outline-none",
        )}
      />

      <div className="mt-3 flex items-center gap-2">
        <span className="tnum inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs text-ink">
          {minutesToLabel(startMin)}
          <span className="text-faint">–</span>
          {minutesToLabel(endMin)}
        </span>
        {dotColor && (
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: dotColor }}
          />
        )}
        {/* La data compare solo se l'AI ha spostato l'attività su un altro
            giorno: senza, uno slot finito su ieri lo scopri a consuntivo. */}
        {date !== slotDate && (
          <span className="text-xs text-muted">{dayLabel(date)}</span>
        )}
      </div>

      <div className="mt-3">
        <Segmented
          label="Classificazione"
          options={MODES}
          value={mode}
          onChange={changeMode}
        />
      </div>

      {mode === "client" ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Combobox
            label="Cliente"
            placeholder="Cliente…"
            options={clientOptions}
            value={clientId}
            onChange={pickClient}
            onCreate={(name) => void createClient(name)}
            marked={rawText !== null &&clientId !== null}
          />
          <Combobox
            label="Progetto"
            placeholder={clientId ? "Progetto…" : "Prima il cliente"}
            options={clientProjectOptions}
            value={projectId}
            onChange={setProjectId}
            onCreate={(name) => void createProject(name)}
            marked={rawText !== null &&projectId !== null}
          />
        </div>
      ) : (
        <div className="mt-2">
          <Combobox
            label="Progetto interno"
            placeholder="Interno…"
            options={internalOptions}
            value={projectId}
            onChange={setProjectId}
            onCreate={(name) => void createProject(name)}
            marked={rawText !== null &&projectId !== null}
          />
        </div>
      )}

      {aiBusy && (
        <p role="status" className="mt-3 text-xs text-muted">
          Sto leggendo…
        </p>
      )}

      {aiError && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {aiError}
        </p>
      )}

      {rawText !== null && !aiBusy && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Icons.IconSparkles size={13} className="shrink-0 text-accent" />
          <span>Compilato dall'AI — controlla</span>
          <button
            type="button"
            onClick={restoreText}
            className="ml-auto shrink-0 font-medium text-accent hover:underline"
          >
            Ripristina il testo
          </button>
        </div>
      )}

      {templates.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTpl(t)}
              className={cn(
                "inline-flex h-7 max-w-full items-center truncate rounded-sm border px-2.5 text-xs",
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
        {/* A proposta ricevuta torna "Più dettagli": è il passo successivo
            naturale (ed è l'unico modo di vedere le persone riconosciute).
            Per rileggere la frase resta ⌘/Ctrl+Invio. */}
        {canInterpret && rawText === null ? (
          <Button variant="accent" size="sm" onClick={() => void interpret()}>
            <Icons.IconSparkles size={14} />
            Interpreta
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={moreDetails}>
            Più dettagli
            <span aria-hidden className="ml-1">
              ›
            </span>
          </Button>
        )}
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
