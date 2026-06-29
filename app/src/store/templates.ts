import { create } from "zustand";
import type { ActivityTemplate } from "@/data/types";
import {
  allTemplates,
  putTemplate,
  deleteTemplate,
} from "@/data/repositories";
import { persist } from "@/store/persist";

interface TemplateState {
  templates: ActivityTemplate[];
  loadTemplates: () => Promise<void>;
  saveTemplate: (t: ActivityTemplate) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>;
}

/**
 * Template di attività riutilizzabili: salvati dal menu contestuale di
 * un'attività, reinseriti dai chip della creazione rapida. Ordine d'inserimento
 * (la rinomina non riordina, così non sposta il cursore mentre scrivi).
 */
export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  loadTemplates: async () => {
    set({ templates: await allTemplates() });
  },
  saveTemplate: (t) =>
    persist("Salvataggio template", async () => {
      await putTemplate(t);
      const list = get().templates;
      const i = list.findIndex((x) => x.id === t.id);
      set({
        templates:
          i >= 0 ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t],
      });
    }),
  removeTemplate: (id) =>
    persist("Eliminazione template", async () => {
      await deleteTemplate(id);
      set({ templates: get().templates.filter((x) => x.id !== id) });
    }),
}));
