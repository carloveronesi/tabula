import { useEffect, useMemo, useState } from "react";
import type { Entry } from "@/data/types";
import { allEntries } from "@/data/repositories";
import { useInventoryStore } from "@/store/inventory";
import { useToastStore } from "@/store/toast";
import { useUiStore } from "@/store";
import { Button, Combobox, IconButton, Input } from "@/ui";
import type { ComboboxOption } from "@/ui/Combobox";
import { IconClose, IconEdit, IconMerge, IconSearch } from "@/ui/icons";
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

const pickCollaborators = (e: Entry) => e.collaboratorIds;
const pickContacts = (e: Entry) => e.contactIds;

interface Group {
  label: string;
  ids: string[];
}

/** Iniziale accento-insensibile per l'indice a rubrica; non-lettere → «#». */
function firstLetter(name: string): string {
  const c = name
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .charAt(0)
    .toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

/**
 * Costruisce l'indice a rubrica: cerca per nome, filtra per progetto (solo chi
 * compare in un'attività di quel progetto) e raggruppa per iniziale. «#» in coda.
 */
export function buildGroups(opts: {
  entities: { id: string; name: string }[];
  entries: Entry[];
  pickIds: (e: Entry) => string[];
  query: string;
  projectId: string | null;
}): Group[] {
  const q = opts.query.trim().toLowerCase();
  let visible = opts.entities.filter((e) => !q || e.name.toLowerCase().includes(q));
  if (opts.projectId) {
    const inProject = new Set<string>();
    for (const e of opts.entries)
      if (e.projectId === opts.projectId) for (const id of opts.pickIds(e)) inProject.add(id);
    visible = visible.filter((e) => inProject.has(e.id));
  }

  const groups = new Map<string, { id: string; name: string }[]>();
  for (const e of visible) {
    const k = firstLetter(e.name);
    const arr = groups.get(k);
    if (arr) arr.push(e);
    else groups.set(k, [e]);
  }
  return [...groups.entries()]
    .map(([label, arr]) => ({
      label,
      ids: arr.sort((a, b) => a.name.localeCompare(b.name)).map((e) => e.id),
    }))
    .sort(
      (a, b) =>
        (a.label === "#" ? 1 : 0) - (b.label === "#" ? 1 : 0) || a.label.localeCompare(b.label),
    );
}

interface GroupedListProps {
  entities: { id: string; name: string }[];
  entries: Entry[];
  pickIds: (e: Entry) => string[];
  /** Progetti per il filtro (senza l'opzione «Tutti», aggiunta qui). */
  projectOptions: ComboboxOption[];
  searchPlaceholder: string;
  renderRow: (id: string) => React.ReactNode;
}

/** Rubrica: barra cerca + filtro progetto, indice alfabetico in un riquadro scrollabile. */
function GroupedEntityList({
  entities,
  entries,
  pickIds,
  projectOptions,
  searchPlaceholder,
  renderRow,
}: GroupedListProps) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  const groups = useMemo(
    () => buildGroups({ entities, entries, pickIds, query, projectId }),
    [entities, entries, pickIds, query, projectId],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="min-w-40 flex-1"
          aria-label="Cerca"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {projectOptions.length > 0 && (
          <select
            aria-label="Filtra per progetto"
            className="h-9 w-56 shrink-0 rounded border border-line bg-bg px-3 text-sm text-ink focus:border-primary focus:outline-none"
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value || null)}
          >
            <option value="">Tutti i progetti</option>
            {projectOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted">Nessun risultato.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto rounded-lg border border-line">
          {groups.map((g) => (
            <div key={g.label}>
              <h4 className="sticky top-0 z-10 bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">
                {g.label}
              </h4>
              <ul className="divide-y divide-line px-3">{g.ids.map((id) => renderRow(id))}</ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  id: string;
  name: string;
  usage: number;
  /** Riga di contesto sotto il nome (clienti/progetti collegati): disambigua i doppioni. */
  meta?: string;
  /** Ruolo del referente: se definito, la riga lo mostra e lo rende editabile con il nome. */
  role?: string;
  onRole?: (role: string) => void;
  /** Apre la Ricerca filtrata su questo record (solo se ci sono attività). */
  onViewActivities: () => void;
  /** Altri record in cui fondere questo (per il merge). */
  mergeOptions: { id: string; label: string }[];
  onRename: (name: string) => void;
  onMerge: (intoId: string) => void;
  onDelete: () => void;
}

/**
 * Riga gestita: in lettura mostra nome (e ruolo) come testo; la matitina apre la
 * modifica inline di nome e ruolo. Più vedi attività, unione (inline) ed
 * eliminazione (due passi).
 */
function EntityRow({
  id,
  name,
  usage,
  meta,
  role,
  onRole,
  onViewActivities,
  mergeOptions,
  onRename,
  onMerge,
  onDelete,
}: RowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [roleDraft, setRoleDraft] = useState(role ?? "");
  const [merging, setMerging] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setDraft(name), [name]);
  useEffect(() => setRoleDraft(role ?? ""), [role]);

  const startEdit = () => {
    setEditing(true);
    setMerging(false);
    setConfirming(false);
  };
  const cancel = () => {
    setDraft(name);
    setRoleDraft(role ?? "");
    setEditing(false);
  };
  const commit = () => {
    const v = draft.trim();
    if (v && v !== name) onRename(v);
    else setDraft(name);
    if (role !== undefined && roleDraft.trim() !== role) onRole?.(roleDraft.trim());
    setEditing(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    else if (e.key === "Escape") cancel();
  };

  if (editing)
    return (
      <li className="py-1">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Nome"
            autoFocus
            className="min-w-0 flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {role !== undefined && (
            <div className="w-36 shrink-0">
              <Input
                aria-label="Ruolo"
                placeholder="Ruolo"
                value={roleDraft}
                onChange={(e) => setRoleDraft(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>
          )}
          <Button size="sm" onClick={commit}>
            Salva
          </Button>
          <IconButton label="Annulla" size="sm" onClick={cancel}>
            <IconClose size={16} />
          </IconButton>
        </div>
      </li>
    );

  return (
    <li className="space-y-2 py-1">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{name}</span>
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
        <IconButton label={`Modifica ${name}`} size="sm" onClick={startEdit}>
          <IconEdit size={16} />
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
      {role ? <p className="pl-1 text-xs text-muted">Ruolo: {role}</p> : null}

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

  // Opzioni del filtro progetto: «Cliente · Progetto», ordinate per nome.
  const projectFilterOptions = useMemo(
    () =>
      [...projects]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ id: p.id, label: `${clientName(p.clientId) || "Interno"} · ${p.name}` })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, clients],
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
          <GroupedEntityList
            entities={people}
            entries={archive}
            pickIds={pickCollaborators}
            projectOptions={projectFilterOptions}
            searchPlaceholder="Cerca collaboratore…"
            renderRow={(id) => {
              const p = people.find((x) => x.id === id);
              if (!p) return null;
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
            }}
          />
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
          <GroupedEntityList
            entities={sortedContacts}
            entries={archive}
            pickIds={pickContacts}
            projectOptions={projectFilterOptions}
            searchPlaceholder="Cerca referente…"
            renderRow={(id) => {
              const k = contacts.find((x) => x.id === id);
              if (!k) return null;
              const entries = byContact.get(k.id);
              return (
                <EntityRow
                  key={k.id}
                  id={k.id}
                  name={k.name}
                  usage={entries?.length ?? 0}
                  meta={`Cliente: ${clientName(k.clientId) || "—"}`}
                  role={k.role}
                  onRole={(role) => void saveContact({ ...k, role })}
                  onViewActivities={() => openSearch({ contactId: k.id })}
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
            }}
          />
        )}
      </SettingsSection>
    </div>
  );
}
