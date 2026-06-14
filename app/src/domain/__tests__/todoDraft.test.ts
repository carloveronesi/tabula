import { describe, it, expect } from "vitest";
import { newTodo, sortTodos } from "@/domain/todoDraft";
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
