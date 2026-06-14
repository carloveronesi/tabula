import { useEffect, useMemo, useState } from "react";
import type { Project, Todo } from "@/data/types";
import { sortTodos, isOverdue, subtaskProgress } from "@/domain/todoDraft";
import { isoDate } from "@/domain/calendarNav";
import { useTodoStore } from "@/store/todo";
import { useInventoryStore } from "@/store/inventory";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";

const inlineSelect =
  "h-7 shrink-0 rounded border bg-bg px-2 text-xs focus:border-primary focus:outline-none";

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
      className={`rounded border px-3 py-2 ${
        overdue ? "border-danger/40" : "border-line"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={t.done}
          aria-label={`Completa ${t.title}`}
          onChange={() => void toggleTodo(t.id)}
          className="size-4 shrink-0 accent-primary"
        />
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            t.done ? "text-muted line-through" : "text-ink"
          }`}
        >
          {t.title}
        </span>
        <button
          type="button"
          aria-label={`Sottotask ${t.title}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className={`tnum h-7 shrink-0 rounded px-2 text-xs text-muted hover:bg-raised ${
            total > 0 ? "" : "opacity-60"
          }`}
        >
          ☑ {done}/{total}
        </button>
        {projects.length > 0 && (
          <select
            aria-label={`Progetto ${t.title}`}
            value={t.projectId ?? ""}
            onChange={(e) => void setProject(t.id, e.target.value || null)}
            className={`${inlineSelect} max-w-[9rem] border-line text-muted`}
          >
            <option value="">— progetto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <input
          type="date"
          aria-label={`Scadenza ${t.title}`}
          value={t.dueDate ?? ""}
          onChange={(e) => void setDue(t.id, e.target.value || null)}
          className={`${inlineSelect} ${
            overdue ? "border-danger/50 text-danger" : "border-line text-muted"
          }`}
        />
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Elimina ${t.title}`}
          onClick={() => void removeTodo(t.id)}
        >
          ✕
        </Button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1.5 pl-7">
          <div className="flex flex-wrap items-center gap-1.5">
            {t.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-pill bg-raised px-2 py-0.5 text-xs text-muted"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Rimuovi tag ${tag}`}
                  onClick={() => void removeTag(t.id, tag)}
                  className="text-faint hover:text-ink"
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
              className="h-6 w-20 rounded border border-line bg-bg px-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          {t.subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.done}
                aria-label={`Completa sottotask ${s.title}`}
                onChange={() => void toggleSubtask(t.id, s.id)}
                className="size-3.5 shrink-0 accent-primary"
              />
              <span
                className={`min-w-0 flex-1 truncate text-xs ${
                  s.done ? "text-muted line-through" : "text-ink"
                }`}
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
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void addSub();
            }}
          >
            <Input
              aria-label={`Nuovo sottotask ${t.title}`}
              placeholder="Aggiungi un sottotask…"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              className="h-7 text-xs"
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

/**
 * Vista Todo: lista di cose da fare con creazione rapida, completamento,
 * scadenza, progetto collegato e sottotask. Carica i todo dal DB al montaggio;
 * l'ordinamento (non fatti prima, poi per data) è dominio puro (`sortTodos`).
 */
export function TodoView() {
  const todos = useTodoStore((s) => s.todos);
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const addTodo = useTodoStore((s) => s.addTodo);
  const projects = useInventoryStore((s) => s.projects);

  const [title, setTitle] = useState("");

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  const today = isoDate(new Date());
  const sorted = useMemo(() => sortTodos(todos), [todos]);
  const remaining = todos.filter((t) => !t.done).length;
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name, "it")),
    [projects],
  );

  const submit = async () => {
    if (title.trim() === "") return;
    await addTodo(title);
    setTitle("");
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Todo</h2>
        <p className="text-sm text-muted">
          {remaining > 0 ? `${remaining} da completare` : "Tutto fatto"}
        </p>
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

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Nessun todo. Aggiungi la prima attività.
        </p>
      ) : (
        <ul className="space-y-1">
          {sorted.map((t) => (
            <TodoRow key={t.id} todo={t} today={today} projects={sortedProjects} />
          ))}
        </ul>
      )}
    </div>
  );
}
