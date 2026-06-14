import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Id, Todo } from "@/data/types";
import { allTodos, deleteTodo, putTodo } from "@/data/repositories";
import { newTodo } from "@/domain/todoDraft";

interface TodoState {
  todos: Todo[];
  loadTodos: () => Promise<void>;
  addTodo: (title: string, projectId?: Id | null) => Promise<void>;
  toggleTodo: (id: Id) => Promise<void>;
  removeTodo: (id: Id) => Promise<void>;
}

/**
 * Stato dei todo. Le azioni persistono su Dexie e aggiornano la lista in
 * memoria; la vista ordina/filtra (dominio `sortTodos`).
 */
export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loadTodos: async () => {
    set({ todos: await allTodos() });
  },
  addTodo: async (title, projectId = null) => {
    if (title.trim() === "") return;
    const todo = newTodo({ title, projectId }, nanoid(), Date.now());
    await putTodo(todo);
    set({ todos: [...get().todos, todo] });
  },
  toggleTodo: async (id) => {
    const cur = get().todos.find((t) => t.id === id);
    if (!cur) return;
    const updated = { ...cur, done: !cur.done };
    await putTodo(updated);
    set({ todos: get().todos.map((t) => (t.id === id ? updated : t)) });
  },
  removeTodo: async (id) => {
    await deleteTodo(id);
    set({ todos: get().todos.filter((t) => t.id !== id) });
  },
}));
