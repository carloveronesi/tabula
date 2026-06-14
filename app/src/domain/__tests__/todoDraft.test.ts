import { describe, it, expect } from "vitest";
import {
  newTodo,
  sortTodos,
  isOverdue,
  addSubtask,
  toggleSubtask,
  removeSubtask,
  subtaskProgress,
  addTag,
  removeTag,
} from "@/domain/todoDraft";
import type { Todo } from "@/data/types";

function todo(id: string, title: string, done: boolean, createdAt: number): Todo {
  return {
    id,
    title,
    projectId: null,
    tags: [],
    done,
    dueDate: null,
    subtasks: [],
    createdAt,
  };
}

describe("newTodo", () => {
  it("crea un todo con default sani (title trim, non fatto)", () => {
    const t = newTodo({ title: "  Scrivere report  " }, "t1", 1000);
    expect(t).toEqual({
      id: "t1",
      title: "Scrivere report",
      projectId: null,
      tags: [],
      done: false,
      dueDate: null,
      subtasks: [],
      createdAt: 1000,
    });
  });

  it("collega il progetto quando fornito", () => {
    const t = newTodo({ title: "Task", projectId: "p1" }, "t2", 2000);
    expect(t.projectId).toBe("p1");
  });
});

describe("sortTodos", () => {
  it("i non completati prima dei completati, poi per createdAt decrescente", () => {
    const todos = [
      todo("a", "A", true, 100),
      todo("b", "B", false, 200),
      todo("c", "C", false, 300),
      todo("d", "D", true, 400),
    ];
    expect(sortTodos(todos).map((t) => t.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("non muta l'array originale", () => {
    const todos = [todo("a", "A", true, 1), todo("b", "B", false, 2)];
    const copy = [...todos];
    sortTodos(todos);
    expect(todos).toEqual(copy);
  });
});

describe("isOverdue", () => {
  const withDue = (done: boolean, due: string | null): Todo => ({
    ...todo("x", "X", done, 0),
    dueDate: due,
  });

  it("scaduto se la scadenza è precedente a oggi e non è completato", () => {
    expect(isOverdue(withDue(false, "2026-06-13"), "2026-06-14")).toBe(true);
  });

  it("non scaduto se completato", () => {
    expect(isOverdue(withDue(true, "2026-06-13"), "2026-06-14")).toBe(false);
  });

  it("non scaduto se scade oggi o in futuro, o senza scadenza", () => {
    expect(isOverdue(withDue(false, "2026-06-14"), "2026-06-14")).toBe(false);
    expect(isOverdue(withDue(false, "2026-06-20"), "2026-06-14")).toBe(false);
    expect(isOverdue(withDue(false, null), "2026-06-14")).toBe(false);
  });
});

describe("sottotask", () => {
  const base = todo("t", "T", false, 0);

  it("addSubtask aggiunge un sottotask trimmato e ignora i vuoti", () => {
    const a = addSubtask(base, "  Bozza  ", "s1");
    expect(a.subtasks).toEqual([{ id: "s1", title: "Bozza", done: false }]);
    expect(addSubtask(base, "   ", "s2").subtasks).toEqual([]);
  });

  it("addSubtask non muta il todo originale", () => {
    addSubtask(base, "X", "s1");
    expect(base.subtasks).toEqual([]);
  });

  it("toggleSubtask inverte solo il sottotask indicato", () => {
    const a = addSubtask(addSubtask(base, "A", "s1"), "B", "s2");
    const t = toggleSubtask(a, "s1");
    expect(t.subtasks.map((s) => s.done)).toEqual([true, false]);
  });

  it("removeSubtask elimina il sottotask indicato", () => {
    const a = addSubtask(addSubtask(base, "A", "s1"), "B", "s2");
    expect(removeSubtask(a, "s1").subtasks.map((s) => s.id)).toEqual(["s2"]);
  });

  it("subtaskProgress conta completati su totale", () => {
    const a = toggleSubtask(
      addSubtask(addSubtask(base, "A", "s1"), "B", "s2"),
      "s1",
    );
    expect(subtaskProgress(a)).toEqual({ done: 1, total: 2 });
    expect(subtaskProgress(base)).toEqual({ done: 0, total: 0 });
  });
});

describe("tag", () => {
  const base = todo("t", "T", false, 0);

  it("addTag aggiunge un tag trimmato e ignora vuoti e duplicati (case-insensitive)", () => {
    const a = addTag(base, "  Urgente  ");
    expect(a.tags).toEqual(["Urgente"]);
    expect(addTag(a, "urgente").tags).toEqual(["Urgente"]); // duplicato
    expect(addTag(base, "   ").tags).toEqual([]); // vuoto
  });

  it("addTag non muta il todo originale", () => {
    addTag(base, "X");
    expect(base.tags).toEqual([]);
  });

  it("removeTag rimuove il tag indicato (case-insensitive)", () => {
    const a = addTag(addTag(base, "Urgente"), "Lavoro");
    expect(removeTag(a, "urgente").tags).toEqual(["Lavoro"]);
  });
});
