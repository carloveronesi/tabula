import type { ReactNode } from "react";
import type { Entry, EntryType } from "@/data/types";
import { minutesOfDay, minutesToLabel } from "@/domain/slots";
import { copyEntry, duplicateEntry } from "@/features/layout/entryActions";
import { useEditorStore } from "@/store/editor";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
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
      <h3 className="text-xs font-medium text-muted">{label}</h3>
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
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const settings = useSettingsStore((s) => s.settings);

  const clientName = e && clients.find((c) => c.id === e.clientId)?.name;
  const projectName = e && projects.find((p) => p.id === e.projectId)?.name;
  const subtypeName =
    e &&
    e.subtypeId &&
    (e.type === "client"
      ? settings.subtypes.client
      : e.type === "internal"
        ? settings.subtypes.internal
        : []
    ).find((s) => s.id === e.subtypeId)?.label;
  const collaboratorNames = e
    ? e.collaboratorIds
        .map((id) => people.find((p) => p.id === id)?.name)
        .filter((n): n is string => !!n)
    : [];
  const contactNames = e
    ? e.contactIds
        .map((id) => contacts.find((k) => k.id === id)?.name)
        .filter((n): n is string => !!n)
    : [];

  const duplicate = async () => {
    if (e && (await duplicateEntry(e))) hide();
  };

  const copy = () => {
    if (e) copyEntry(e);
  };

  return (
    <Modal
      open={e !== null}
      onClose={hide}
      title={e?.title ?? ""}
      description={e ? <span className="tnum">{whenLabel(e)}</span> : undefined}
      footer={
        e && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={hide}>
              Chiudi
            </Button>
            <Button variant="subtle" onClick={copy}>
              Copia
            </Button>
            <Button variant="subtle" onClick={() => void duplicate()}>
              Duplica
            </Button>
            <Button variant="primary" onClick={() => openEdit(e)}>
              Modifica
            </Button>
          </div>
        )
      }
    >
      {e && (
        <div className="space-y-4">
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
            {subtypeName && (
              <span className="rounded-pill bg-raised px-2 py-0.5 text-xs text-ink">
                {subtypeName}
              </span>
            )}
            {e.milestone && (
              <span className="rounded-pill bg-raised px-2 py-0.5 text-xs text-muted">
                ◆ {e.milestone}
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
          {collaboratorNames.length > 0 && (
            <Section label="Collaboratori">
              {collaboratorNames.join(", ")}
            </Section>
          )}
          {contactNames.length > 0 && (
            <Section label="Referenti">{contactNames.join(", ")}</Section>
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
        </div>
      )}
    </Modal>
  );
}
