import { create } from "zustand";
import type { Client, Project } from "@/data/types";
import { allClients, allProjects } from "@/data/repositories";

interface InventoryState {
  clients: Client[];
  projects: Project[];
  loadInventory: () => Promise<void>;
}

/**
 * Anagrafiche (clienti, progetti) per i selettori dell'editor.
 * Caricate una volta; la cascata cliente→progetto filtra in memoria.
 */
export const useInventoryStore = create<InventoryState>((set) => ({
  clients: [],
  projects: [],
  loadInventory: async () => {
    const [clients, projects] = await Promise.all([
      allClients(),
      allProjects(),
    ]);
    set({ clients, projects });
  },
}));
