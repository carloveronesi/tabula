import type { ReactNode } from "react";
import { nanoid } from "nanoid";
import type { Entry, EntryType } from "@/data/types";
import { minutesOfDay, minutesToLabel } from "@/domain/slots";
import { firstFreeRange, duplicateEntry } from "@/domain/duplicate";
import { useEditorStore } from "@/store/editor";
import { useInventoryStore } from "@/store/inventory";
import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import { useToastStore } from "@/store/toast";
import { Button, Markdown, Modal } from "@/ui";

const TYPE_LABEL: Record<EntryType, string> = {
  client: "Cliente",
  internal: "Interno",
  event: "Evento",
  vacation: "Ferie",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function whenLabel(e: Entry): string {
  const date = cap(
    new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(e.startsAt)),
  );
  const from = minutesToLabel(minutesOfDay(e.startsAt));
  const to = minutesToLabel(minutesOfDay(e.endsAt));
  return `${date} · ${from}–${to}`;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </h3>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  );
}

/**
 * Pannello (Modal) di dettaglio di una attività: quando, classificazione e i
 * testi (note, problemi, prossimi passi, link). Sola lettura; "Modifica" apre
 * l'editor sulla stessa entry.
 */
export function EntryDetail() {
  const e = useEditorStore((s) => s.detail);
  const hide = useEditorStore((s) => s.hideDetail);
  const openEdit = useEditorStore((s) => s.openEdit);
  const clients = useInventoryStore((s) => s.clients);
  const projects = useInventoryStore((s) => s.projects);
  const entries = useCalendarStore((s) => s.entries);
  const saveEntry = useCalendarStore((s) => s.saveEntry);
  const undo = useCalendarStore((s) => s.undo);
  const settings = useSettingsStore((s) => s.settings);
  const notify = useToastStore((s) => s.notify);

  const clientName = e && clients.find((c) => c.id === e.clientId)?.name;
  const projectName = e && projects.find((p) => p.id === e.projectId)?.name;

  const duplicate = async () => {
    if (!e) return;
    const date = e.startsAt.slice(0, 10);
    const duration = minutesOfDay(e.endsAt) - minutesOfDay(e.startsAt);
    const wh = settings.workHours;
    const range = firstFreeRange(
      entries,
      date,
      duration,
      { startMin: wh.morningStart, endMin: wh.afternoonEnd },
      settings.slotMinutes,
    );
    if (!range) {
      notify("Nessuno spazio libero in giornata");
      return;
    }
    await saveEntry(
      duplicateEntry(e, date, range.startMin, range.endMin, nanoid(), Date.now()),
    );
    notify("Attività duplicata", {
      action: { label: "Annulla", run: () => void undo() },
    });
    hide();
  };

  return (
    <Modal open={e !== null} onClose={hide} title={e?.title ?? ""}>
      {e && (
        <div className="space-y-4">
          <p className="tnum text-sm text-muted">{whenLabel(e)}</p>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-pill bg-raised px-2 py-0.5 text-xs text-ink">
              {TYPE_LABEL[e.type]}
            </span>
            {clientName && (
              <span className="rounded-pill bg-raised px-2 py-0.5 text-xs text-ink">
                {clientName}
              </span>
            )}
            {projectName && (
              <span className="rounded-pill bg-primary-wash px-2 py-0.5 text-xs text-accent">
                {projectName}
              </span>
            )}
          </div>

          {e.notes && (
            <Section label="Note">
              <Markdown>{e.notes}</Markdown>
            </Section>
          )}
          {e.blockers && (
            <Section label="Problemi">
              <Markdown>{e.blockers}</Markdown>
            </Section>
          )}
          {e.nextSteps && (
            <Section label="Prossimi passi">
              <Markdown>{e.nextSteps}</Markdown>
            </Section>
          )}
          {e.links.length > 0 && (
            <Section label="Link">
              <ul className="space-y-1">
                {e.links.map((l) => (
                  <li key={l.url}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline underline-offset-2"
                    >
                      {l.label || l.url}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={hide}>
              Chiudi
            </Button>
            <Button variant="subtle" onClick={() => void duplicate()}>
              Duplica
            </Button>
            <Button variant="primary" onClick={() => openEdit(e)}>
              Modifica
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
