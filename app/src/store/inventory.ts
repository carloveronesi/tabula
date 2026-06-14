import { create } from "zustand";
import type { Client, Contact, Person, Project } from "@/data/types";
import {
  allClients,
  allContacts,
  allPeople,
  allProjects,
  deleteProject,
  putProject,
} from "@/data/repositories";

interface InventoryState {
  clients: Client[];
  projects: Project[];
  people: Person[];
  contacts: Contact[];
  loadInventory: () => Promise<void>;
  saveProject: (project: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
}

/**
 * Anagrafiche (clienti, progetti, persone, contatti) per i selettori
 * dell'editor. Caricate una volta; la cascata cliente→progetto e il filtro
 * referenti per cliente avvengono in memoria.
 */
export const useInventoryStore = create<InventoryState>((set, get) => ({
  clients: [],
  projects: [],
  people: [],
  contacts: [],
  loadInventory: async () => {
    const [clients, projects, people, contacts] = await Promise.all([
      allClients(),
      allProjects(),
      allPeople(),
      allContacts(),
    ]);
    set({ clients, projects, people, contacts });
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
