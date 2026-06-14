import { useEffect, useMemo, useState } from "react";
import { sortTodos } from "@/domain/todoDraft";
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
  const removeTodo = useTodoStore((s) => s.removeTodo);
  const projects = useInventoryStore((s) => s.projects);

  const [title, setTitle] = useState("");

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  const sorted = useMemo(() => sortTodos(todos), [todos]);
  const remaining = todos.filter((t) => !t.done).length;
  const projectName = (id: string | null) =>
    id ? (projects.find((p) => p.id === id)?.name ?? null) : null;

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
            const proj = projectName(t.projectId);
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded border border-line px-3 py-2"
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
                  {proj && (
                    <span className="ml-2 text-xs text-muted">· {proj}</span>
                  )}
                </span>
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
