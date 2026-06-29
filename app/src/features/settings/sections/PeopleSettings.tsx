import { useEffect, useMemo, useState } from "react";
import type { Entry } from "@/data/types";
import { allEntries } from "@/data/repositories";
import { useInventoryStore } from "@/store/inventory";
import { useToastStore } from "@/store/toast";
import { Button, Combobox, IconButton, Input } from "@/ui";
import { IconClose, IconMerge } from "@/ui/icons";
import { SettingsSection } from "@/features/settings/SettingsSection";

/** Conta quante volte ogni id compare in una lista di id presa da ogni entry. */
function countRefs(entries: Entry[], pick: (e: Entry) => string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) for (const id of pick(e)) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

function usageLabel(n: number): string {
  return n ? `in ${n} attività` : "mai usato";
}

interface RowProps {
  id: string;
  name: string;
  usage: number;
  /** Riga secondaria (es. cliente del contatto). */
  meta?: string;
  /** Campo extra a destra del nome (es. ruolo del contatto). */
  extra?: React.ReactNode;
  /** Altri record in cui fondere questo (per il merge). */
  mergeOptions: { id: string; label: string }[];
  onRename: (name: string) => void;
  onMerge: (intoId: string) => void;
  onDelete: () => void;
}

/** Riga gestita: rinomina (onBlur), unione (inline) ed eliminazione (due passi). */
function EntityRow({
  id,
  name,
  usage,
  meta,
  extra,
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
 * Rinomina, unisci i doppioni e elimina; l'unione/eliminazione riassegna o
 * toglie i riferimenti da attività, team e progetti.
 */
export function PeopleSettings() {
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const clients = useInventoryStore((s) => s.clients);
  const savePerson = useInventoryStore((s) => s.savePerson);
  const saveContact = useInventoryStore((s) => s.saveContact);
  const mergePerson = useInventoryStore((s) => s.mergePerson);
  const removePerson = useInventoryStore((s) => s.removePerson);
  const mergeContact = useInventoryStore((s) => s.mergeContact);
  const removeContact = useInventoryStore((s) => s.removeContact);
  const notify = useToastStore((s) => s.notify);

  // Archivio completo solo per i conteggi d'uso. Ricaricato quando l'inventario
  // cambia (merge/delete) così i numeri restano coerenti.
  const [archive, setArchive] = useState<Entry[]>([]);
  useEffect(() => {
    void allEntries().then(setArchive);
  }, [people, contacts]);

  const personUsage = useMemo(
    () => countRefs(archive, (e) => e.collaboratorIds),
    [archive],
  );
  const contactUsage = useMemo(
    () => countRefs(archive, (e) => e.contactIds),
    [archive],
  );
  const peopleOptions = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.name })),
    [people],
  );
  const contactOptions = useMemo(
    () => contacts.map((k) => ({ id: k.id, label: k.name })),
    [contacts],
  );
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  const sortedContacts = useMemo(
    () => [...contacts].sort((a, b) => a.name.localeCompare(b.name)),
    [contacts],
  );

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Collaboratori"
        description="Le persone con cui lavori, usate come collaboratori nelle attività. Unisci i doppioni o elimina chi non serve: i riferimenti vengono aggiornati ovunque."
      >
        {people.length === 0 ? (
          <p className="text-sm text-muted">
            Nessuna persona: si creano al volo dal campo «Collaboratori» dell'editor.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {people.map((p) => (
              <EntityRow
                key={p.id}
                id={p.id}
                name={p.name}
                usage={personUsage.get(p.id) ?? 0}
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
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection
        title="Referenti"
        description="I contatti lato cliente. Il ruolo è opzionale; unione ed eliminazione aggiornano i riferimenti in attività e progetti."
      >
        {contacts.length === 0 ? (
          <p className="text-sm text-muted">
            Nessun referente: si creano al volo dal campo «Referenti» dell'editor.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {sortedContacts.map((k) => (
              <EntityRow
                key={k.id}
                id={k.id}
                name={k.name}
                usage={contactUsage.get(k.id) ?? 0}
                meta={`Cliente: ${clientName(k.clientId)}`}
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
            ))}
          </ul>
        )}
      </SettingsSection>
    </div>
  );
}
