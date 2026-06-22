import { useMemo } from "react";
import type { Todo } from "@/data/types";
import { widgetTodos } from "@/domain/todoDraft";
import { isoDate } from "@/domain/calendarNav";
import { cn } from "@/ui/cn";
import { useTodoStore } from "@/store/todo";

/** Quanti todo mostrare al massimo nel widget prima del "+N". */
const MAX = 5;

const fmtDue = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(
    new Date(iso),
  );

/** Etichetta/colore della scadenza relativa a oggi. */
function dueHint(todo: Todo, today: string): { label: string; tone: string } | null {
  if (!todo.dueDate) return null;
  if (todo.dueDate < today) return { label: "scaduto", tone: "text-danger" };
  if (todo.dueDate === today) return { label: "oggi", tone: "text-accent" };
  return { label: fmtDue(todo.dueDate), tone: "text-faint" };
}

/**
 * Widget "Da fare" nella sidebar della vista Giorno: richiama i todo non
 * completati (scaduti e in scadenza in cima), con spunta per completare e
 * scorciatoia alla vista Todo. Connesso allo store; i todo sono caricati dallo
 * shell.
 */
export function DayTodoWidget({ onOpenTodo }: { onOpenTodo: () => void }) {
  const todos = useTodoStore((s) => s.todos);
  const toggleTodo = useTodoStore((s) => s.toggleTodo);

  const today = isoDate(new Date());
  const pending = useMemo(() => widgetTodos(todos, today), [todos, today]);
  const shown = pending.slice(0, MAX);
  const extra = pending.length - shown.length;

  return (
    <div className="rounded-lg border border-line bg-surface p-[18px] shadow-card">
      <div className="flex items-baseline justify-between">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-faint">
          Da fare
        </div>
        <button
          type="button"
          onClick={onOpenTodo}
          className="text-[11px] font-medium text-muted transition-colors duration-[var(--dur-fast)] ease-out hover:text-accent"
        >
          Tutti →
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-muted">Niente da fare.</p>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-2">
          {shown.map((t) => {
            const hint = dueHint(t, today);
            return (
              <li key={t.id} className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={false}
                  aria-label={`Completa ${t.title}`}
                  onChange={() => void toggleTodo(t.id)}
                  className="size-4 shrink-0 accent-primary"
                />
                <button
                  type="button"
                  onClick={onOpenTodo}
                  title={t.title}
                  className="min-w-0 flex-1 truncate text-left text-[12.5px] text-ink/90 hover:text-accent"
                >
                  {t.title}
                </button>
                {hint && (
                  <span className={cn("shrink-0 text-[10.5px] font-medium", hint.tone)}>
                    {hint.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {extra > 0 && (
        <button
          type="button"
          onClick={onOpenTodo}
          className="mt-2.5 text-[11.5px] font-medium text-muted hover:text-accent"
        >
          +{extra} altri
        </button>
      )}
    </div>
  );
}
