import { useEffect, useMemo, useState } from "react";
import { sortTodos, isOverdue } from "@/domain/todoDraft";
import { isoDate } from "@/domain/calendarNav";
import { useTodoStore } from "@/store/todo";
import { useInventoryStore } from "@/store/inventory";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";

/**
 * Vista Todo: lista di cose da fare con creazione rapida, completamento ed
 * eliminazione. Carica i todo dal DB al montaggio; l'ordinamento (non fatti
 * prima, poi per data) è dominio puro (`sortTodos`).
 */
export function TodoView() {
  const todos = useTodoStore((s) => s.todos);
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const addTodo = useTodoStore((s) => s.addTodo);
  const toggleTodo = useTodoStore((s) => s.toggleTodo);
  const setDue = useTodoStore((s) => s.setDue);
  const setProject = useTodoStore((s) => s.setProject);
  const removeTodo = useTodoStore((s) => s.removeTodo);
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
          {remaining > 0
            ? `${remaining} da completare`
            : "Tutto fatto"}
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
          {sorted.map((t) => {
            const overdue = isOverdue(t, today);
            return (
              <li
                key={t.id}
                data-testid={`todo-${t.id}`}
                data-overdue={overdue ? "true" : undefined}
                className={`flex items-center gap-3 rounded border px-3 py-2 ${
                  overdue ? "border-danger/40" : "border-line"
                }`}
              >
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
                {sortedProjects.length > 0 && (
                  <select
                    aria-label={`Progetto ${t.title}`}
                    value={t.projectId ?? ""}
                    onChange={(e) =>
                      void setProject(t.id, e.target.value || null)
                    }
                    className="h-7 max-w-[9rem] shrink-0 rounded border border-line bg-bg px-2 text-xs text-muted focus:border-primary focus:outline-none"
                  >
                    <option value="">— progetto</option>
                    {sortedProjects.map((p) => (
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
                  className={`h-7 shrink-0 rounded border bg-bg px-2 text-xs focus:border-primary focus:outline-none ${
                    overdue
                      ? "border-danger/50 text-danger"
                      : "border-line text-muted"
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
