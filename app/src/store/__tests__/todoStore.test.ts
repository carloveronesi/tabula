import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/data/db";
import { useTodoStore } from "@/store/todo";

beforeEach(async () => {
  await db.todos.clear();
  useTodoStore.setState({ todos: [] });
});

describe("useTodoStore", () => {
  it("default: vuoto", () => {
    expect(useTodoStore.getState().todos).toEqual([]);
  });

  it("addTodo crea un todo (DB + store) e ignora i titoli vuoti", async () => {
    await useTodoStore.getState().addTodo("  ");
    expect(useTodoStore.getState().todos).toHaveLength(0);

    await useTodoStore.getState().addTodo("Scrivere report");
    const todos = useTodoStore.getState().todos;
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({ title: "Scrivere report", done: false });
    expect(await db.todos.get(todos[0].id)).toBeTruthy();
  });

  it("toggleTodo inverte done e persiste", async () => {
    await useTodoStore.getState().addTodo("Task");
    const id = useTodoStore.getState().todos[0].id;

    await useTodoStore.getState().toggleTodo(id);
    expect(useTodoStore.getState().todos[0].done).toBe(true);
    expect((await db.todos.get(id))?.done).toBe(true);

    await useTodoStore.getState().toggleTodo(id);
    expect(useTodoStore.getState().todos[0].done).toBe(false);
  });

  it("setDue imposta e azzera la scadenza, persistendo", async () => {
    await useTodoStore.getState().addTodo("Task");
    const id = useTodoStore.getState().todos[0].id;

    await useTodoStore.getState().setDue(id, "2026-06-20");
    expect(useTodoStore.getState().todos[0].dueDate).toBe("2026-06-20");
    expect((await db.todos.get(id))?.dueDate).toBe("2026-06-20");

    await useTodoStore.getState().setDue(id, null);
    expect(useTodoStore.getState().todos[0].dueDate).toBeNull();
  });

  it("setProject collega e scollega un progetto, persistendo", async () => {
    await useTodoStore.getState().addTodo("Task");
    const id = useTodoStore.getState().todos[0].id;

    await useTodoStore.getState().setProject(id, "p1");
    expect(useTodoStore.getState().todos[0].projectId).toBe("p1");
    expect((await db.todos.get(id))?.projectId).toBe("p1");

    await useTodoStore.getState().setProject(id, null);
    expect(useTodoStore.getState().todos[0].projectId).toBeNull();
  });

  it("gestisce i sottotask (aggiungi/completa/rimuovi) persistendo", async () => {
    await useTodoStore.getState().addTodo("Task");
    const id = useTodoStore.getState().todos[0].id;

    await useTodoStore.getState().addSubtask(id, "Bozza");
    await useTodoStore.getState().addSubtask(id, "Revisione");
    let subs = useTodoStore.getState().todos[0].subtasks;
    expect(subs.map((s) => s.title)).toEqual(["Bozza", "Revisione"]);
    expect((await db.todos.get(id))?.subtasks).toHaveLength(2);

    await useTodoStore.getState().toggleSubtask(id, subs[0].id);
    expect(useTodoStore.getState().todos[0].subtasks[0].done).toBe(true);

    await useTodoStore.getState().removeSubtask(id, subs[0].id);
    subs = useTodoStore.getState().todos[0].subtasks;
    expect(subs.map((s) => s.title)).toEqual(["Revisione"]);
  });

  it("removeTodo elimina (DB + store)", async () => {
    await useTodoStore.getState().addTodo("A");
    await useTodoStore.getState().addTodo("B");
    const [a] = useTodoStore.getState().todos;

    await useTodoStore.getState().removeTodo(a.id);
    expect(useTodoStore.getState().todos.map((t) => t.title)).toEqual(["B"]);
    expect(await db.todos.get(a.id)).toBeUndefined();
  });

  it("loadTodos carica dal DB", async () => {
    await useTodoStore.getState().addTodo("Persistito");
    useTodoStore.setState({ todos: [] });

    await useTodoStore.getState().loadTodos();
    expect(useTodoStore.getState().todos.map((t) => t.title)).toEqual([
      "Persistito",
    ]);
  });
});
