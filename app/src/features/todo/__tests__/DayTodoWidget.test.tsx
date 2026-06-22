import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Todo } from "@/data/types";
import { useTodoStore } from "@/store/todo";
import { DayTodoWidget } from "@/features/todo/DayTodoWidget";

function todo(over: Partial<Todo> & { id: string; title: string }): Todo {
  return {
    projectId: null,
    tags: [],
    done: false,
    dueDate: null,
    subtasks: [],
    createdAt: 0,
    ...over,
  };
}

beforeEach(() => {
  useTodoStore.setState({
    todos: [
      todo({ id: "a", title: "Scrivere report" }),
      todo({ id: "b", title: "Fatto", done: true }),
    ],
  });
});

describe("DayTodoWidget", () => {
  it("mostra i da fare ed esclude i completati", () => {
    render(<DayTodoWidget onOpenTodo={() => {}} />);
    expect(screen.getByText("Scrivere report")).toBeInTheDocument();
    expect(screen.queryByText("Fatto")).not.toBeInTheDocument();
  });

  it("la spunta completa il todo (lo toglie dalla lista)", async () => {
    render(<DayTodoWidget onOpenTodo={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Completa Scrivere report" }));
    await waitFor(() =>
      expect(useTodoStore.getState().todos.find((t) => t.id === "a")?.done).toBe(true),
    );
    expect(screen.queryByText("Scrivere report")).not.toBeInTheDocument();
  });

  it("'Tutti →' apre la vista Todo", () => {
    const onOpenTodo = vi.fn();
    render(<DayTodoWidget onOpenTodo={onOpenTodo} />);
    fireEvent.click(screen.getByRole("button", { name: "Tutti →" }));
    expect(onOpenTodo).toHaveBeenCalledOnce();
  });

  it("stato vuoto quando non c'è nulla da fare", () => {
    useTodoStore.setState({ todos: [todo({ id: "b", title: "Fatto", done: true })] });
    render(<DayTodoWidget onOpenTodo={() => {}} />);
    expect(screen.getByText("Niente da fare.")).toBeInTheDocument();
  });
});
