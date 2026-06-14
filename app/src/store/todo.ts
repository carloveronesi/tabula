import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Id, ISODate, Todo } from "@/data/types";
import { allTodos, deleteTodo, putTodo } from "@/data/repositories";
import { newTodo } from "@/domain/todoDraft";

interface TodoState {
  todos: Todo[];
  loadTodos: () => Promise<void>;
  addTodo: (title: string, projectId?: Id | null) => Promise<void>;
  toggleTodo: (id: Id) => Promise<void>;
  setDue: (id: Id, dueDate: ISODate | null) => Promise<void>;
  setProject: (id: Id, projectId: Id | null) => Promise<void>;
  removeTodo: (id: Id) => Promise<void>;
}

/**
 * Stato dei todo. Le azioni persistono su Dexie e aggiornano la lista in
 * memoria; la vista ordina/filtra (dominio `sortTodos`).
 */
export const useTodoStore = create<TodoState>((set, get) => {
  /** Applica una modifica parziale a un todo: persiste e aggiorna la lista. */
  const patch = async (id: Id, fields: Partial<Todo>) => {
    const cur = get().todos.find((t) => t.id === id);
    if (!cur) return;
    const updated = { ...cur, ...fields };
    await putTodo(updated);
    set({ todos: get().todos.map((t) => (t.id === id ? updated : t)) });
  };

  return {
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
    toggleTodo: (id) => patch(id, { done: !get().todos.find((t) => t.id === id)?.done }),
    setDue: (id, dueDate) => patch(id, { dueDate }),
    setProject: (id, projectId) => patch(id, { projectId }),
    removeTodo: async (id) => {
      await deleteTodo(id);
      set({ todos: get().todos.filter((t) => t.id !== id) });
    },
  };
});
