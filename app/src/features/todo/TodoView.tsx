import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Project, Todo } from "@/data/types";
import { sortTodos, isOverdue, subtaskProgress } from "@/domain/todoDraft";
import { isoDate } from "@/domain/calendarNav";
import { projectColor } from "@/domain/colors";
import { useTodoStore } from "@/store/todo";
import { useInventoryStore } from "@/store/inventory";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Segmented, type SegmentedOption } from "@/ui/Segmented";
import { IconChevronDown } from "@/ui/icons";
import { cn } from "@/ui/cn";

type Filter = "open" | "all" | "done";

const FILTERS: SegmentedOption<Filter>[] = [
  { id: "open", label: "Aperte" },
  { id: "all", label: "Tutte" },
  { id: "done", label: "Completate" },
];

/** Etichetta breve della scadenza (es. "16 giu"); "" se assente. */
function dueLabel(due: string | null): string {
  if (!due) return "";
  const d = new Date(`${due}T00:00:00`);
  if (Number.isNaN(d.getTime())) return due;
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
  }).format(d);
}

const IconCal = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M4 9h16M8 3v4M16 3v4" />
  </svg>
);

/** Pastiglia colore del progetto (o segnaposto neutro se nessuno). */
function Dot({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden
      className="h-2 w-2 shrink-0 rounded-[3px]"
      style={{
        backgroundColor: color ?? "transparent",
        outline: color ? undefined : "1px solid var(--line)",
      }}
    />
  );
}

/**
 * Selettore progetto compatto: un chip come trigger e una lista stilizzata resa
 * in un portale (così sfugge all'`overflow-hidden` della riga). Navigabile da
 * tastiera (↑/↓/Invio/Esc); la riga vuota "— progetto" scollega il progetto.
 */
function ProjectPicker({
  label,
  value,
  projects,
  selected,
  onChange,
}: {
  label: string;
  value: string | null;
  projects: Project[];
  selected: Project | null;
  onChange: (id: string | null) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [highlight, setHighlight] = useState(0);

  const options = useMemo(
    () => [
      { id: "", name: "— progetto", color: null as string | null },
      ...projects.map((p) => ({ id: p.id, name: p.name, color: projectColor(p) })),
    ],
    [projects],
  );
  const activeId = value ?? "";

  // Apre allineando l'evidenza alla voce selezionata.
  useEffect(() => {
    if (open) setHighlight(Math.max(0, options.findIndex((o) => o.id === activeId)));
  }, [open, options, activeId]);

  // Posiziona sotto il chip; ripiega verso l'alto e rientra nei bordi.
  useLayoutEffect(() => {
    if (!open || !btnRef.current || !listRef.current) return;
    const MARGIN = 8;
    const b = btnRef.current.getBoundingClientRect();
    const l = listRef.current.getBoundingClientRect();
    let top = b.bottom + 4;
    if (top + l.height > window.innerHeight - MARGIN) {
      top = Math.max(MARGIN, b.top - l.height - 4);
    }
    const left = Math.min(b.left, window.innerWidth - l.width - MARGIN);
    setPos({ top, left: Math.max(MARGIN, left) });
    listRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !listRef.current?.contains(t)) close();
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const choose = (id: string) => {
    onChange(id || null);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(options[highlight].id);
    } else if (e.key === "Escape") {
      setOpen(false);
      btnRef.current?.focus();
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-raised pl-2 pr-1.5 text-xs text-muted hover:text-ink"
      >
        <Dot color={selected ? projectColor(selected) : null} />
        <span className="max-w-[8.5rem] truncate">
          {selected ? selected.name : "— progetto"}
        </span>
        <IconChevronDown
          size={13}
          aria-hidden
          className={cn("text-faint transition-transform", open && "rotate-180")}
        />
      </button>
      {open &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            style={
              pos
                ? { position: "fixed", top: pos.top, left: pos.left }
                : { position: "fixed", visibility: "hidden" }
            }
            className="z-dropdown max-h-64 min-w-[12rem] overflow-auto rounded-lg border border-line bg-surface p-1 shadow-card focus:outline-none"
          >
            {options.map((o, i) => (
              <li
                key={o.id || "none"}
                role="option"
                aria-selected={o.id === activeId}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(o.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                  i === highlight && "bg-raised",
                  o.id === activeId ? "font-medium text-ink" : "text-muted",
                )}
              >
                <Dot color={o.color} />
                <span className="truncate">{o.name}</span>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}

function TodoRow({
  todo: t,
  today,
  projects,
}: {
  todo: Todo;
  today: string;
  projects: Project[];
}) {
  const toggleTodo = useTodoStore((s) => s.toggleTodo);
  const setDue = useTodoStore((s) => s.setDue);
  const setProject = useTodoStore((s) => s.setProject);
  const removeTodo = useTodoStore((s) => s.removeTodo);
  const addSubtask = useTodoStore((s) => s.addSubtask);
  const toggleSubtask = useTodoStore((s) => s.toggleSubtask);
  const removeSubtask = useTodoStore((s) => s.removeSubtask);
  const addTag = useTodoStore((s) => s.addTag);
  const removeTag = useTodoStore((s) => s.removeTag);

  const [expanded, setExpanded] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const [tagInput, setTagInput] = useState("");

  const overdue = isOverdue(t, today);
  const { done, total } = subtaskProgress(t);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const project = projects.find((p) => p.id === t.projectId) ?? null;

  const addSub = async () => {
    if (subTitle.trim() === "") return;
    await addSubtask(t.id, subTitle);
    setSubTitle("");
  };

  const addNewTag = async () => {
    if (tagInput.trim() === "") return;
    await addTag(t.id, tagInput);
    setTagInput("");
  };

  return (
    <li
      data-testid={`todo-${t.id}`}
      data-overdue={overdue ? "true" : undefined}
      className={cn(
        "relative overflow-hidden rounded-xl border border-line bg-surface shadow-card",
        t.done && "bg-raised/40",
      )}
    >
      {overdue && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-danger" />
      )}
      <div className="flex items-center gap-3 px-3.5 py-3">
        <input
          type="checkbox"
          checked={t.done}
          aria-label={`Completa ${t.title}`}
          onChange={() => void toggleTodo(t.id)}
          className="size-[18px] shrink-0 rounded accent-primary"
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm",
            t.done ? "text-muted line-through" : "font-medium text-ink",
          )}
        >
          {t.title}
        </span>

        <button
          type="button"
          aria-label={`Sottotask ${t.title}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex h-7 shrink-0 items-center gap-2 rounded-lg px-2 hover:bg-raised",
            total === 0 && "opacity-70",
          )}
        >
          {total > 0 ? (
            <>
              <span className="h-1.5 w-12 overflow-hidden rounded-pill bg-raised">
                <span
                  className="block h-full rounded-pill bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="tnum text-[11px] text-muted">
                {done}/{total}
              </span>
            </>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className={cn(
                "text-faint transition-transform",
                expanded && "rotate-90",
              )}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          )}
        </button>

        {projects.length > 0 && (
          <ProjectPicker
            label={`Progetto ${t.title}`}
            value={t.projectId ?? null}
            projects={projects}
            selected={project}
            onChange={(id) => void setProject(t.id, id)}
          />
        )}

        <label
          className={cn(
            "tnum relative flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[11px]",
            overdue
              ? "bg-danger/10 text-danger"
              : t.dueDate
                ? "bg-raised text-muted"
                : "text-faint hover:bg-raised",
          )}
        >
          <IconCal />
          <span>{dueLabel(t.dueDate) || "—"}</span>
          <input
            type="date"
            aria-label={`Scadenza ${t.title}`}
            value={t.dueDate ?? ""}
            onClick={(e) => e.currentTarget.showPicker?.()}
            onChange={(e) => void setDue(t.id, e.target.value || null)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        <Button
          variant="ghost"
          size="sm"
          aria-label={`Elimina ${t.title}`}
          onClick={() => void removeTodo(t.id)}
          className="shrink-0 text-muted"
        >
          ✕
        </Button>
      </div>

      {expanded && (
        <div className="space-y-2.5 border-t border-line/70 px-3.5 pb-3.5 pl-[42px] pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {t.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-sm bg-primary-wash px-2 py-0.5 text-xs text-accent"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Rimuovi tag ${tag}`}
                  onClick={() => void removeTag(t.id, tag)}
                  className="text-accent/60 hover:text-accent"
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              aria-label={`Nuovo tag ${t.title}`}
              placeholder="+ tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addNewTag();
                }
              }}
              className="h-6 w-20 rounded-md border border-line bg-bg px-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          {t.subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={s.done}
                aria-label={`Completa sottotask ${s.title}`}
                onChange={() => void toggleSubtask(t.id, s.id)}
                className="size-4 shrink-0 rounded accent-primary"
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[13px]",
                  s.done ? "text-faint line-through" : "text-ink",
                )}
              >
                {s.title}
              </span>
              <button
                type="button"
                aria-label={`Elimina sottotask ${s.title}`}
                onClick={() => void removeSubtask(t.id, s.id)}
                className="shrink-0 rounded px-1 text-xs text-muted hover:bg-raised"
              >
                ✕
              </button>
            </div>
          ))}
          <form
            className="flex items-center gap-2 rounded-md border border-dashed border-line px-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              void addSub();
            }}
          >
            <input
              aria-label={`Nuovo sottotask ${t.title}`}
              placeholder="Aggiungi un sottotask…"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              className="h-8 flex-1 bg-transparent text-[13px] placeholder:text-faint focus:outline-none"
            />
            <Button
              type="submit"
              variant="subtle"
              size="sm"
              disabled={subTitle.trim() === ""}
            >
              Aggiungi
            </Button>
          </form>
        </div>
      )}
    </li>
  );
}

function Group({
  label,
  count,
  danger,
  children,
}: {
  label: string;
  count: number;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2 px-0.5">
        <h3
          className={cn(
            "text-[11px] font-bold uppercase tracking-wider",
            danger ? "text-danger" : "text-muted",
          )}
        >
          {label}
        </h3>
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
            danger ? "bg-danger text-white" : "bg-raised text-muted",
          )}
        >
          {count}
        </span>
      </div>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

/**
 * Vista Todo: cose da fare raggruppate per stato (in ritardo, da fare,
 * completate) con creazione rapida, completamento, scadenza, progetto collegato
 * e sottotask. Il filtro in alto restringe ai gruppi rilevanti. L'ordinamento è
 * dominio puro (`sortTodos`, `isOverdue`).
 */
export function TodoView() {
  const todos = useTodoStore((s) => s.todos);
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const addTodo = useTodoStore((s) => s.addTodo);
  const projects = useInventoryStore((s) => s.projects);

  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Filter>("open");

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  const today = isoDate(new Date());
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name, "it")),
    [projects],
  );

  const { overdue, todo, done } = useMemo(() => {
    const sorted = sortTodos(todos);
    return {
      overdue: sorted.filter((t) => isOverdue(t, today)),
      todo: sorted.filter((t) => !t.done && !isOverdue(t, today)),
      done: sorted.filter((t) => t.done),
    };
  }, [todos, today]);

  const remaining = overdue.length + todo.length;

  const showOverdue = filter !== "done" && overdue.length > 0;
  const showTodo = filter !== "done";
  const showDone = filter !== "open";
  const visibleCount =
    (showOverdue ? overdue.length : 0) +
    (showTodo ? todo.length : 0) +
    (showDone ? done.length : 0);

  const submit = async () => {
    if (title.trim() === "") return;
    await addTodo(title);
    setTitle("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Todo</h2>
          <span className="text-sm text-muted">
            {remaining > 0 ? `${remaining} da completare` : "Tutto fatto"}
          </span>
        </div>
        <Segmented
          label="Filtro todo"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          aria-label="Nuovo todo"
          placeholder="Aggiungi un'attività…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={title.trim() === ""}>
          Aggiungi
        </Button>
      </form>

      {todos.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Nessun todo. Aggiungi la prima attività.
        </p>
      ) : visibleCount === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Niente da mostrare in questa vista.
        </p>
      ) : (
        <div className="space-y-6">
          {showOverdue && (
            <Group label="In ritardo" count={overdue.length} danger>
              {overdue.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  today={today}
                  projects={sortedProjects}
                />
              ))}
            </Group>
          )}
          {showTodo && todo.length > 0 && (
            <Group label="Da fare" count={todo.length}>
              {todo.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  today={today}
                  projects={sortedProjects}
                />
              ))}
            </Group>
          )}
          {showDone && done.length > 0 && (
            <Group label="Completate" count={done.length}>
              {done.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  today={today}
                  projects={sortedProjects}
                />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}
