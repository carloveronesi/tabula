import { useEffect, useMemo, useState } from "react";
import type { Entry } from "@/data/types";
import { allEntries } from "@/data/repositories";
import { useInventoryStore } from "@/store/inventory";
import { useToastStore } from "@/store/toast";
import { useUiStore } from "@/store";
import { Button, Combobox, IconButton, Input } from "@/ui";
import { IconClose, IconMerge, IconSearch } from "@/ui/icons";
import { SettingsSection } from "@/features/settings/SettingsSection";

/** Raggruppa le entry per ciascun id presente nella lista estratta da ogni entry. */
function groupByRef(entries: Entry[], pick: (e: Entry) => string[]): Map<string, Entry[]> {
  const m = new Map<string, Entry[]>();
  for (const e of entries)
    for (const id of pick(e)) {
      const arr = m.get(id);
      if (arr) arr.push(e);
      else m.set(id, [e]);
    }
  return m;
}

function usageLabel(n: number): string {
  return n ? `in ${n} attività` : "mai usato";
}

interface RowProps {
  id: string;
  name: string;
  usage: number;
  /** Riga di contesto sotto il nome (clienti/progetti collegati): disambigua i doppioni. */
  meta?: string;
  /** Campo extra a destra del nome (es. ruolo del contatto). */
  extra?: React.ReactNode;
  /** Apre la Ricerca filtrata su questo record (solo se ci sono attività). */
  onViewActivities: () => void;
  /** Altri record in cui fondere questo (per il merge). */
  mergeOptions: { id: string; label: string }[];
  onRename: (name: string) => void;
  onMerge: (intoId: string) => void;
  onDelete: () => void;
}

/** Riga gestita: rinomina (onBlur), vedi attività, unione (inline), eliminazione (due passi). */
function EntityRow({
  id,
  name,
  usage,
  meta,
  extra,
  onViewActivities,
  mergeOptions,
  onRename,
  onMerge,
  onDelete,
}: RowProps) {
  const [draft, setDraft] = useState(name);
  const [merging, setMerging] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setDraft(name), [name]);

  const commit = () => {
    const v = draft.trim();
    if (v && v !== name) onRename(v);
    else setDraft(name);
  };

  return (
    <li className="space-y-2 py-1">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Nome"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        {extra}
        <span className="w-28 shrink-0 text-right text-xs text-muted">
          {usageLabel(usage)}
        </span>
        <IconButton
          label={`Vedi attività di ${name}`}
          size="sm"
          disabled={usage === 0}
          onClick={onViewActivities}
        >
          <IconSearch size={16} />
        </IconButton>
        <IconButton
          label={`Unisci ${name} in un'altra`}
          size="sm"
          aria-pressed={merging}
          disabled={mergeOptions.length === 0}
          onClick={() => {
            setMerging((v) => !v);
            setConfirming(false);
          }}
        >
          <IconMerge size={16} />
        </IconButton>
        {confirming ? (
          <Button variant="danger" size="sm" onClick={onDelete}>
            Conferma
          </Button>
        ) : (
          <IconButton
            label={`Elimina ${name}`}
            size="sm"
            onClick={() => {
              setConfirming(true);
              setMerging(false);
            }}
          >
            <IconClose size={16} />
          </IconButton>
        )}
      </div>

      {meta && <p className="pl-1 text-xs text-muted">{meta}</p>}

      {merging && (
        <div className="pl-1">
          <Combobox
            label={`Unisci ${name} in`}
            placeholder="Unisci in…"
            options={mergeOptions.filter((o) => o.id !== id)}
            value={null}
            onChange={(intoId) => {
              setMerging(false);
              onMerge(intoId);
            }}
          />
        </div>
      )}
    </li>
  );
}

/**
 * Gestione anagrafiche: collaboratori (persone) e referenti (contatti).
 * Ogni riga mostra i clienti/progetti collegati (per distinguere i doppioni),
 * apre la Ricerca filtrata sulle sue attività, e permette rinomina, unione ed
 * eliminazione — riassegnando o togliendo i riferimenti da attività, team e
 * progetti.
 */
export function PeopleSettings() {
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const clients = useInventoryStore((s) => s.clients);
  const projects = useInventoryStore((s) => s.projects);
  const savePerson = useInventoryStore((s) => s.savePerson);
  const saveContact = useInventoryStore((s) => s.saveContact);
  const mergePerson = useInventoryStore((s) => s.mergePerson);
  const removePerson = useInventoryStore((s) => s.removePerson);
  const mergeContact = useInventoryStore((s) => s.mergeContact);
  const removeContact = useInventoryStore((s) => s.removeContact);
  const notify = useToastStore((s) => s.notify);
  const openSearch = useUiStore((s) => s.openSearch);

  // Archivio completo per conteggi e sottotitolo. Ricaricato quando l'inventario
  // cambia (merge/delete) così i numeri restano coerenti.
  const [archive, setArchive] = useState<Entry[]>([]);
  useEffect(() => {
    void allEntries().then(setArchive);
  }, [people, contacts]);

  const clientName = (id: string | null) =>
    (id && clients.find((c) => c.id === id)?.name) || "";
  const projectName = (id: string | null) =>
    (id && projects.find((p) => p.id === id)?.name) || "";
  // Contesto di una entry per i collaboratori: il cliente, o il progetto se interno.
  const entryContext = (e: Entry) =>
    clientName(e.clientId) || projectName(e.projectId) || "Interno";

  const byPerson = useMemo(() => groupByRef(archive, (e) => e.collaboratorIds), [archive]);
  const byContact = useMemo(() => groupByRef(archive, (e) => e.contactIds), [archive]);

  // Sottotitolo: clienti/progetti distinti collegati, per distinguere i doppioni.
  const contextsOf = (entries: Entry[] | undefined): string => {
    const seen = new Set<string>();
    for (const e of entries ?? []) seen.add(entryContext(e));
    return [...seen].join(" · ");
  };

  const peopleOptions = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.name })),
    [people],
  );
  const contactOptions = useMemo(
    () => contacts.map((k) => ({ id: k.id, label: k.name })),
    [contacts],
  );

  const sortedContacts = useMemo(
    () => [...contacts].sort((a, b) => a.name.localeCompare(b.name)),
    [contacts],
  );

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Collaboratori"
        description="Le persone con cui lavori, usate come collaboratori nelle attività. Il sottotitolo mostra i clienti/progetti collegati; «Vedi attività» apre la Ricerca filtrata su quella persona. Unisci i doppioni o elimina chi non serve: i riferimenti vengono aggiornati ovunque."
      >
        {people.length === 0 ? (
          <p className="text-sm text-muted">
            Nessuna persona: si creano al volo dal campo «Collaboratori» dell'editor.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {people.map((p) => {
              const entries = byPerson.get(p.id);
              return (
                <EntityRow
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  usage={entries?.length ?? 0}
                  meta={contextsOf(entries)}
                  onViewActivities={() => openSearch({ collaboratorId: p.id })}
                  mergeOptions={peopleOptions}
                  onRename={(name) => void savePerson({ ...p, name })}
                  onMerge={(intoId) => {
                    const into = people.find((x) => x.id === intoId);
                    void mergePerson(p.id, intoId);
                    notify(`${p.name} unita in ${into?.name ?? "—"}`);
                  }}
                  onDelete={() => {
                    void removePerson(p.id);
                    notify(`${p.name} eliminata`);
                  }}
                />
              );
            })}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection
        title="Referenti"
        description="I contatti lato cliente. Il ruolo è opzionale; «Vedi attività» apre la Ricerca filtrata sul referente. Unione ed eliminazione aggiornano i riferimenti in attività e progetti."
      >
        {contacts.length === 0 ? (
          <p className="text-sm text-muted">
            Nessun referente: si creano al volo dal campo «Referenti» dell'editor.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {sortedContacts.map((k) => {
              const entries = byContact.get(k.id);
              return (
                <EntityRow
                  key={k.id}
                  id={k.id}
                  name={k.name}
                  usage={entries?.length ?? 0}
                  meta={`Cliente: ${clientName(k.clientId) || "—"}`}
                  onViewActivities={() => openSearch({ contactId: k.id })}
                  extra={
                    <Input
                      aria-label="Ruolo"
                      className="w-40 shrink-0"
                      placeholder="Ruolo"
                      defaultValue={k.role}
                      onBlur={(e) => {
                        const role = e.target.value.trim();
                        if (role !== k.role) void saveContact({ ...k, role });
                      }}
                    />
                  }
                  mergeOptions={contactOptions}
                  onRename={(name) => void saveContact({ ...k, name })}
                  onMerge={(intoId) => {
                    const into = contacts.find((x) => x.id === intoId);
                    void mergeContact(k.id, intoId);
                    notify(`${k.name} unito in ${into?.name ?? "—"}`);
                  }}
                  onDelete={() => {
                    void removeContact(k.id);
                    notify(`${k.name} eliminato`);
                  }}
                />
              );
            })}
          </ul>
        )}
      </SettingsSection>
    </div>
  );
}
