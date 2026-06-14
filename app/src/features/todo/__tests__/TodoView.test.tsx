import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import { useTodoStore } from "@/store/todo";
import { TodoView } from "@/features/todo/TodoView";

beforeEach(async () => {
  await db.todos.clear();
  useTodoStore.setState({ todos: [] });
});

describe("TodoView", () => {
  it("stato vuoto quando non ci sono todo", async () => {
    render(<TodoView />);
    await waitFor(() =>
      expect(screen.getByText(/nessun todo/i)).toBeInTheDocument(),
    );
  });

  it("aggiunge un todo dall'input", async () => {
    render(<TodoView />);
    const input = screen.getByLabelText("Nuovo todo") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Scrivere report" } });
    fireEvent.click(screen.getByRole("button", { name: /aggiungi/i }));

    await waitFor(() =>
      expect(screen.getByText("Scrivere report")).toBeInTheDocument(),
    );
    expect(input.value).toBe(""); // input ripulito
  });

  it("completa e poi elimina un todo", async () => {
    await useTodoStore.getState().addTodo("Task");
    render(<TodoView />);

    const checkbox = await screen.findByRole("checkbox");
    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(useTodoStore.getState().todos[0].done).toBe(true),
    );

    fireEvent.click(screen.getByRole("button", { name: /elimina/i }));
    await waitFor(() =>
      expect(useTodoStore.getState().todos).toHaveLength(0),
    );
  });
});
