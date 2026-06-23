import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import type { Project } from "@/data/types";
import { useTodoStore } from "@/store/todo";
import { useInventoryStore } from "@/store/inventory";
import { TodoView } from "@/features/todo/TodoView";

beforeEach(async () => {
  await db.todos.clear();
  useTodoStore.setState({ todos: [] });
  useInventoryStore.setState({
    clients: [],
    projects: [{ id: "p1", name: "Sito web" } as Project],
  });
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

  it("imposta una scadenza dall'input data", async () => {
    await useTodoStore.getState().addTodo("Task");
    render(<TodoView />);

    const dueInput = (await screen.findByLabelText(
      "Scadenza Task",
    )) as HTMLInputElement;
    fireEvent.change(dueInput, { target: { value: "2026-12-31" } });

    await waitFor(() =>
      expect(useTodoStore.getState().todos[0].dueDate).toBe("2026-12-31"),
    );
  });

  it("collega un progetto dal selettore", async () => {
    await useTodoStore.getState().addTodo("Task");
    render(<TodoView />);

    const select = (await screen.findByLabelText(
      "Progetto Task",
    )) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "p1" } });

    await waitFor(() =>
      expect(useTodoStore.getState().todos[0].projectId).toBe("p1"),
    );
  });

  it("evidenzia i todo scaduti", async () => {
    await useTodoStore.getState().addTodo("Scaduto");
    const id = useTodoStore.getState().todos[0].id;
    await useTodoStore.getState().setDue(id, "2000-01-01"); // nel passato
    render(<TodoView />);

    const item = await screen.findByTestId(`todo-${id}`);
    expect(item).toHaveAttribute("data-overdue", "true");
  });

  it("espande, aggiunge e completa un sottotask", async () => {
    await useTodoStore.getState().addTodo("Task");
    render(<TodoView />);

    fireEvent.click(await screen.findByLabelText("Sottotask Task"));

    const subInput = screen.getByLabelText("Nuovo sottotask Task");
    fireEvent.change(subInput, { target: { value: "Bozza" } });
    fireEvent.submit(subInput);

    await waitFor(() =>
      expect(useTodoStore.getState().todos[0].subtasks).toHaveLength(1),
    );
    expect(screen.getByText("Bozza")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Completa sottotask Bozza"));
    await waitFor(() =>
      expect(useTodoStore.getState().todos[0].subtasks[0].done).toBe(true),
    );
  });

  it("aggiunge e rimuove un tag", async () => {
    await useTodoStore.getState().addTodo("Task");
    render(<TodoView />);

    fireEvent.click(await screen.findByLabelText("Sottotask Task"));

    const tagInput = screen.getByLabelText("Nuovo tag Task");
    fireEvent.change(tagInput, { target: { value: "Urgente" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });

    await waitFor(() =>
      expect(useTodoStore.getState().todos[0].tags).toEqual(["Urgente"]),
    );
    expect(screen.getByText("Urgente")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Rimuovi tag Urgente"));
    await waitFor(() =>
      expect(useTodoStore.getState().todos[0].tags).toEqual([]),
    );
  });

  it("completa e poi elimina un todo", async () => {
    await useTodoStore.getState().addTodo("Task");
    render(<TodoView />);

    const checkbox = await screen.findByRole("checkbox");
    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(useTodoStore.getState().todos[0].done).toBe(true),
    );

    // I completati stanno nel gruppo "Completate", nascosto dal filtro di
    // default "Aperte": passa a "Tutte" per raggiungerli.
    fireEvent.click(screen.getByRole("button", { name: "Tutte" }));
    fireEvent.click(await screen.findByRole("button", { name: /elimina/i }));
    await waitFor(() =>
      expect(useTodoStore.getState().todos).toHaveLength(0),
    );
  });
});
