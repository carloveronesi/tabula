import { useEffect } from "react";
import type { Entry, Project } from "@/data/types";
import type { ProjectStats } from "@/domain/projectStats";
import type { ProjectActivity } from "@/domain/projectActivity";
import { buildDigest, digestSignature } from "@/domain/ai/projectDigest";
import { isoDate } from "@/domain/calendarNav";
import { useAiRewrite } from "@/features/ai/useAiRewrite";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { Button, Icons, Markdown } from "@/ui";

const RULES = `Sei un capo progetto che legge il consuntivo di un progetto e dice a un collega A CHE PUNTO SIAMO.
Scrivi in italiano, in markdown, massimo 180 parole, senza titolo iniziale.
Parti dal lavoro più recente. Struttura: due o tre frasi su cosa si è chiuso ultimamente, cosa è aperto adesso e quali filoni sono fermi da un po' (guarda le date: hai la data di oggi); poi un elenco puntato di 2-4 punti che meritano attenzione.
NON descrivere di cosa si occupa il progetto e non riformulare descrizione e obiettivi: li ha scritti l'utente e sono nella stessa pagina. Usali solo come metro per dire cosa risulta coperto e cosa no.
Parla di quello che viene fatto, non di quanto: niente commenti su ritmo, continuità, mesi più o meno carichi o distribuzione delle ore. Cita le ore solo se sforano il budget stimato.
Basati solo sui dati che ricevi, senza inventare scadenze, persone o fatti. Se un dato non c'è, lascia perdere quel punto in silenzio: non dire mai che manca, non commentare i dati ricevuti né come sono registrati.`;

const fmtWhen = (ms: number) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));

/**
 * Riassunto AI del progetto: una chiamata sola, il cui esito resta salvato sul
 * progetto finché le attività non cambiano. Inerte (non renderizza nulla) se
 * l'AI non è attiva nei Settings, come gli altri punti AI dell'app.
 */
export function ProjectSummaryCard({
  project,
  stat,
  activity,
  entries,
  clientName,
  className,
}: {
  project: Project;
  stat: ProjectStats | undefined;
  activity: ProjectActivity | null;
  entries: Entry[];
  clientName: string | null;
  className?: string;
}) {
  const { state, run, reset, enabled } = useAiRewrite(RULES);
  const saveProject = useInventoryStore((s) => s.saveProject);
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const subtypes = useSettingsStore((s) => s.settings.subtypes);
  const workHours = useSettingsStore((s) => s.settings.workHours);

  const cached = project.aiSummary;
  const sig = digestSignature(stat);

  // La proposta pronta si salva sul progetto e la macchina a stati torna a
  // riposo: da lì in poi la fonte è la cache, uguale per chi riapre la pagina.
  useEffect(() => {
    if (state.status !== "ready") return;
    void saveProject({
      ...project,
      aiSummary: { text: state.proposal, at: Date.now(), sig },
    });
    reset();
  }, [state, project, sig, saveProject, reset]);

  if (!enabled) return null;

  const stale = cached !== undefined && cached.sig !== sig;
  const loading = state.status === "loading";
  const start = () =>
    run(
      buildDigest({
        project,
        stat,
        activity,
        entries,
        clientName,
        today: isoDate(new Date()),
        subtypes,
        people: [...people, ...contacts],
        workHours,
      }),
    );

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
          Come va
        </div>
        {cached && (
          <span className="text-xs text-muted">Aggiornato il {fmtWhen(cached.at)}</span>
        )}
      </div>

      {cached ? (
        <Markdown className="mt-2.5 text-sm leading-relaxed text-muted">
          {cached.text}
        </Markdown>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {entries.length === 0
            ? "Nessuna attività registrata: non c'è ancora niente da riassumere."
            : "Manda le attività di questo progetto all'AI e fatti dire come procede."}
        </p>
      )}

      {stale && (
        <p className="mt-2 text-xs text-muted">
          I dati sono cambiati da allora.
        </p>
      )}

      {state.status === "error" && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.message}
        </p>
      )}

      <Button
        variant="ghost"
        className="mt-3"
        onClick={start}
        disabled={loading || entries.length === 0}
      >
        <Icons.IconSparkles size={16} />
        {loading ? "Sto leggendo…" : cached ? "Rigenera" : "Riassumi"}
      </Button>
    </div>
  );
}
