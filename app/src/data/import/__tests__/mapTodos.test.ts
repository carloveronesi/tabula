import { describe, it, expect } from "vitest";
import { mapTodos } from "@/data/import/mapTodos";
import { buildInventory } from "@/data/import/buildInventory";
import type { ParsedExport } from "@/data/import/parseExport";
import type { SourceTodo } from "@/data/import/sourceTypes";

function seqIds() {
  let n = 0;
  return () => `id${n++}`;
}

// Inventario: progetti "Sito"(id0) e "AI Week"(id1)
const parsed: ParsedExport = {
  months: {},
  settings: null,
  clients: null,
  people: [],
  projects: {
    prj_a: { id: "prj_a", name: "Sito", kind: "client", clientKey: null, status: "active" },
    prj_b: { id: "prj_b", name: "AI Week", kind: "internal", clientKey: null, status: "active" },
  },
  todos: [],
};
const inv = buildInventory(parsed, seqIds());

function todo(over: Partial<SourceTodo>): SourceTodo {
  return { id: "t", title: "T", isDone: false, createdAt: 0, ...over };
}

describe("mapTodos", () => {
  it("mappa un todo risolvendo projectId dal nome progetto", () => {
    const [t] = mapTodos(
      [
        todo({
          id: "t1",
          title: "A",
          isDone: true,
          project: "Sito",
          tags: ["x"],
          endDate: "2026-04-08",
          createdAt: 1,
        }),
      ],
      inv,
    );

    expect(t).toEqual({
      id: "t1",
      title: "A",
      projectId: "id0",
      tags: ["x"],
      done: true,
      dueDate: "2026-04-08",
      subtasks: [],
      createdAt: 1,
    });
  });

  it("project vuoto o sconosciuto → projectId null", () => {
    const out = mapTodos(
      [
        todo({ id: "t2", project: "" }),
        todo({ id: "t3", project: "Inesistente" }),
      ],
      inv,
    );
    expect(out.map((t) => t.projectId)).toEqual([null, null]);
  });

  it("default tolleranti: tags [], dueDate null, subtasks []", () => {
    const [t] = mapTodos([todo({ id: "t4" })], inv);
    expect(t).toMatchObject({ tags: [], dueDate: null, subtasks: [] });
  });

  it("conserva l'id sorgente (uuid) e createdAt", () => {
    const [t] = mapTodos([todo({ id: "uuid-xyz", createdAt: 999 })], inv);
    expect(t.id).toBe("uuid-xyz");
    expect(t.createdAt).toBe(999);
  });
});
