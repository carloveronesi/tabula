import { useEffect, useMemo, useState } from "react";
import type { Entry, EntryType } from "@/data/types";
import { searchEntries } from "@/domain/search";
import { allEntries } from "@/data/repositories";
import { useInventoryStore } from "@/store/inventory";
import { useEditorStore } from "@/store/editor";
import { Input, Segmented, type SegmentedOption } from "@/ui";

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
  const showDetail = useEditorStore((s) => s.showDetail);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");

  useEffect(() => {
    void allEntries().then(setEntries);
  }, []);

  const results = useMemo(
    () => searchEntries(entries, { query, type: type === "all" ? null : type }),
    [entries, query, type],
  );

  const meta = (e: Entry) => {
    const client = clients.find((c) => c.id === e.clientId)?.name;
    const project = projects.find((p) => p.id === e.projectId)?.name;
    return [client, project].filter(Boolean).join(" · ");
  };

  const active = query.trim() !== "" || type !== "all";

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

      {!active && (
        <p className="py-8 text-center text-sm text-muted">
          Scrivi qualcosa o scegli un tipo per cercare.
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
