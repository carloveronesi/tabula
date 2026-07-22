import type { EntryType, Id, Project } from "@/data/types";

/** Opzione per un Combobox (strutturalmente uguale a ComboboxOption di @/ui). */
export interface Option {
  id: Id;
  label: string;
}

/** Opzioni da entità con nome: clienti, progetti, persone, contatti. Pura. */
export function nameOptions<T extends { id: Id; name: string }>(
  items: T[],
): Option[] {
  return items.map((x) => ({ id: x.id, label: x.name }));
}

/**
 * Progetti selezionabili per un'attività: coerenti col tipo (`kind`), del cliente
 * dato (`clientId` null ⇒ interni), con gli archiviati nascosti salvo `keepId`
 * (quello già scelto, che resta visibile). Da ordinare poi per frequenza d'uso
 * e mappare in opzioni. Pura.
 */
export function projectsFor(
  projects: Project[],
  opts: { kind: EntryType; clientId: Id | null; keepId?: Id | null },
): Project[] {
  return projects.filter(
    (p) =>
      p.kind === opts.kind &&
      p.clientId === opts.clientId &&
      (p.status !== "archived" || p.id === opts.keepId),
  );
}
