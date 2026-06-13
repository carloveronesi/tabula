import { useMemo } from "react";
import type { EntryType } from "@/data/types";
import { summarize } from "@/domain/summary";
import { formatHours } from "@/domain/format";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";

const TYPE_LABEL: Record<EntryType, string> = {
  client: "Cliente",
  internal: "Interno",
  event: "Evento",
  vacation: "Ferie",
};

interface Row {
  label: string;
  minutes: number;
}

function Bars({ rows, max, tint }: { rows: Row[]; max: number; tint: string }) {
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li
          key={r.label}
          className="relative flex items-center justify-between overflow-hidden rounded border border-line px-3 py-1.5"
        >
          <span
            aria-hidden
            className={`absolute inset-y-0 left-0 ${tint}`}
            style={{ width: `${max > 0 ? (r.minutes / max) * 100 : 0}%` }}
          />
          <span className="relative truncate text-sm text-ink">{r.label}</span>
          <span className="tnum relative text-sm tabular-nums text-muted">
            {formatHours(r.minutes)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Riepilogo del mese: ore totali registrate, ripartite per cliente e per tipo.
 * Legge le entry del periodo dal calendar store (caricate da useCalendarData).
 */
export function SummaryView() {
  const entries = useCalendarStore((s) => s.entries);
  const clients = useInventoryStore((s) => s.clients);
  const summary = useMemo(() => summarize(entries), [entries]);

  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? "Cliente sconosciuto";

  const clientRows: Row[] = summary.byClient.map((c) => ({
    label: clientName(c.clientId),
    minutes: c.minutes,
  }));
  const typeRows: Row[] = summary.byType.map((t) => ({
    label: TYPE_LABEL[t.type],
    minutes: t.minutes,
  }));

  if (summary.totalMin === 0) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <p className="text-sm text-muted">
          Nessuna attività registrata in questo mese.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Totale registrato
        </p>
        <p className="tnum font-serif text-4xl text-ink">
          {formatHours(summary.totalMin)}
        </p>
      </header>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Per cliente
        </h3>
        {clientRows.length > 0 ? (
          <Bars
            rows={clientRows}
            max={clientRows[0].minutes}
            tint="bg-accent-wash"
          />
        ) : (
          <p className="text-sm text-muted">Nessuna attività con cliente.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Per tipo
        </h3>
        <Bars rows={typeRows} max={typeRows[0].minutes} tint="bg-primary-wash" />
      </section>
    </div>
  );
}
