import { create } from "zustand";
import type { Client, Project } from "@/data/types";
import {
  allClients,
  allProjects,
  deleteProject,
  putProject,
} from "@/data/repositories";

interface InventoryState {
  clients: Client[];
  projects: Project[];
  loadInventory: () => Promise<void>;
  saveProject: (project: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
}

/**
 * Anagrafiche (clienti, progetti) per i selettori dell'editor.
 * Caricate una volta; la cascata cliente→progetto filtra in memoria.
 */
export const useInventoryStore = create<InventoryState>((set, get) => ({
  clients: [],
  projects: [],
  loadInventory: async () => {
    const [clients, projects] = await Promise.all([
      allClients(),
      allProjects(),
    ]);
    set({ clients, projects });
  },
  saveProject: async (project) => {
    await putProject(project);
    const rest = get().projects.filter((p) => p.id !== project.id);
    set({ projects: [...rest, project] });
  },
  removeProject: async (id) => {
    await deleteProject(id);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },
}));
