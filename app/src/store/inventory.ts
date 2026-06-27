import { create } from "zustand";
import type { Client, Contact, Person, Project } from "@/data/types";
import {
  allClients,
  allContacts,
  allPeople,
  allProjects,
  deleteProject,
  putClient,
  putContact,
  putPerson,
  putProject,
} from "@/data/repositories";
import { persist } from "@/store/persist";

interface InventoryState {
  clients: Client[];
  projects: Project[];
  people: Person[];
  contacts: Contact[];
  loadInventory: () => Promise<void>;
  saveProject: (project: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  saveClient: (client: Client) => Promise<void>;
  savePerson: (person: Person) => Promise<void>;
  saveContact: (contact: Contact) => Promise<void>;
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
  saveProject: (project) =>
    persist("Salvataggio progetto", async () => {
      await putProject(project);
      const rest = get().projects.filter((p) => p.id !== project.id);
      set({ projects: [...rest, project] });
    }),
  removeProject: (id) =>
    persist("Eliminazione progetto", async () => {
      await deleteProject(id);
      set({ projects: get().projects.filter((p) => p.id !== id) });
    }),
  saveClient: (client) =>
    persist("Salvataggio cliente", async () => {
      await putClient(client);
      const rest = get().clients.filter((c) => c.id !== client.id);
      set({
        clients: [...rest, client].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }),
  savePerson: (person) =>
    persist("Salvataggio persona", async () => {
      await putPerson(person);
      const rest = get().people.filter((p) => p.id !== person.id);
      set({
        people: [...rest, person].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }),
  saveContact: (contact) =>
    persist("Salvataggio contatto", async () => {
      await putContact(contact);
      const rest = get().contacts.filter((k) => k.id !== contact.id);
      set({ contacts: [...rest, contact] });
    }),
}));
