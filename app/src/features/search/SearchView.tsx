import { useEffect, useMemo, useState } from "react";
import type { Entry, EntryType, Id } from "@/data/types";
import { searchEntries } from "@/domain/search";
import { allEntries } from "@/data/repositories";
import { useInventoryStore } from "@/store/inventory";
import { useEditorStore } from "@/store/editor";
import { useUiStore } from "@/store";
import { Button, Combobox, Field, Input, Segmented, type SegmentedOption } from "@/ui";

type TypeFilter = EntryType | "all";

const TYPE_FILTERS: SegmentedOption<TypeFilter>[] = [
  { id: "all", label: "Tutti" },
  { id: "client", label: "Cliente" },
  { id: "internal", label: "Interno" },
  { id: "event", label: "Evento" },
  { id: "vacation", label: "Ferie" },
];

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

/**
 * Vista Ricerca: cerca tra tutte le attività dell'archivio per testo e tipo.
 * Un risultato apre il dettaglio (riusa EntryDetail montato nello shell).
 */
export function SearchView() {
  const clients = useInventoryStore((s) => s.clients);
  const projects = useInventoryStore((s) => s.projects);
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const showDetail = useEditorStore((s) => s.showDetail);
  const searchSeed = useUiStore((s) => s.searchSeed);
  const consumeSearchSeed = useUiStore((s) => s.consumeSearchSeed);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [clientId, setClientId] = useState<Id | null>(null);
  const [projectId, setProjectId] = useState<Id | null>(null);
  const [collaboratorId, setCollaboratorId] = useState<Id | null>(null);
  const [contactId, setContactId] = useState<Id | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    void allEntries().then(setEntries);
  }, []);

  // Pre-filtri arrivati da un'altra vista (es. "Vedi attività" di una persona).
  useEffect(() => {
    if (!searchSeed) return;
    setCollaboratorId(searchSeed.collaboratorId ?? null);
    setContactId(searchSeed.contactId ?? null);
    consumeSearchSeed();
  }, [searchSeed, consumeSearchSeed]);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.name })),
    [clients],
  );
  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => (clientId ? p.clientId === clientId : true))
        .map((p) => ({ id: p.id, label: p.name })),
    [projects, clientId],
  );
  const peopleOptions = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.name })),
    [people],
  );
  const contactOptions = useMemo(
    () => contacts.map((k) => ({ id: k.id, label: k.name })),
    [contacts],
  );

  const results = useMemo(
    () =>
      searchEntries(entries, {
        query,
        type: type === "all" ? null : type,
        clientId,
        projectId,
        collaboratorId,
        contactId,
        from: from || null,
        to: to || null,
      }),
    [entries, query, type, clientId, projectId, collaboratorId, contactId, from, to],
  );

  const meta = (e: Entry) => {
    const client = clients.find((c) => c.id === e.clientId)?.name;
    const project = projects.find((p) => p.id === e.projectId)?.name;
    return [client, project].filter(Boolean).join(" · ");
  };

  const active =
    query.trim() !== "" ||
    type !== "all" ||
    clientId !== null ||
    projectId !== null ||
    collaboratorId !== null ||
    contactId !== null ||
    from !== "" ||
    to !== "";

  const clearFilters = () => {
    setQuery("");
    setType("all");
    setClientId(null);
    setProjectId(null);
    setCollaboratorId(null);
    setContactId(null);
    setFrom("");
    setTo("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Input
        type="search"
        aria-label="Cerca"
        autoFocus
        placeholder="Cerca tra le tue attività…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Segmented
        label="Tipo"
        options={TYPE_FILTERS}
        value={type}
        onChange={setType}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Cliente">
          <Combobox
            label="Cliente"
            placeholder="Tutti"
            options={clientOptions}
            value={clientId}
            onChange={(id) => {
              setClientId(id);
              setProjectId(null); // il progetto dipende dal cliente
            }}
          />
        </Field>
        <Field label="Progetto">
          <Combobox
            label="Progetto"
            placeholder="Tutti"
            options={projectOptions}
            value={projectId}
            onChange={setProjectId}
          />
        </Field>
        <Field label="Collaboratore">
          <Combobox
            label="Collaboratore"
            placeholder="Tutti"
            options={peopleOptions}
            value={collaboratorId}
            onChange={setCollaboratorId}
          />
        </Field>
        <Field label="Referente">
          <Combobox
            label="Referente"
            placeholder="Tutti"
            options={contactOptions}
            value={contactId}
            onChange={setContactId}
          />
        </Field>
        <Field label="Dal">
          <Input
            type="date"
            aria-label="Dal"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Al">
          <Input
            type="date"
            aria-label="Al"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </div>

      {active && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            {results.length}{" "}
            {results.length === 1 ? "risultato" : "risultati"}
          </span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Pulisci filtri
          </Button>
        </div>
      )}

      {!active && (
        <p className="py-8 text-center text-sm text-muted">
          Scrivi qualcosa o imposta un filtro per cercare.
        </p>
      )}
      {active && results.length === 0 && (
        <p className="py-8 text-center text-sm text-muted">Nessun risultato.</p>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-line">
          {results.map((e) => {
            const m = meta(e);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => showDetail(e)}
                  className="w-full px-1 py-2.5 text-left transition-colors duration-[var(--dur-fast)] ease-out hover:bg-raised"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-ink">
                      {e.title || "(senza titolo)"}
                    </span>
                    <span className="tnum shrink-0 text-xs text-muted">
                      {fmtDay(e.startsAt)}
                    </span>
                  </div>
                  {m && <p className="mt-0.5 text-xs text-muted">{m}</p>}
                  {e.notes && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                      {e.notes}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
