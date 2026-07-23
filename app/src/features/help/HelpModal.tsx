import type { ReactNode } from "react";
import { SHORTCUTS, type KeyInput, type ShortcutDoc } from "@/domain/keymap";
import { Modal } from "@/ui";

// ponytail: un solo controllo dello user agent, serve unicamente a scegliere fra
// ⌘ e Ctrl nelle etichette; le scorciatoie vere accettano già entrambi.
const isMac = /mac/i.test(navigator.userAgent);

function keyLabel(k: KeyInput): string {
  const mod = k.metaKey || k.ctrlKey ? (isMac ? "⌘" : "Ctrl+") : "";
  const shift = k.shiftKey ? (isMac ? "⇧" : "Shift+") : "";
  const name = k.key.length === 1 ? k.key.toUpperCase() : k.key;
  // Su mac i simboli si scrivono attaccati e in ordine ⇧⌘; su Windows a parole.
  return isMac ? `${shift}${mod}${name}` : `${mod}${shift}${name}`;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-line bg-raised px-1.5 py-0.5 font-mono text-[11px] leading-none text-ink">
      {children}
    </kbd>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-5 first:border-0 first:pt-0">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

const GROUPS: ShortcutDoc["group"][] = ["Navigazione", "Attività", "Modifica"];

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: "Riempi le ore nel Giorno",
    body: (
      <>
        Trascina sulla griglia per creare un blocco, oppure premi <Kbd>N</Kbd>.
        Nel riquadro che si apre bastano titolo, cliente o progetto e orario.
      </>
    ),
  },
  {
    title: "Se stai lavorando adesso, usa il timer",
    body: (
      <>
        <Kbd>T</Kbd> lo avvia e lo ferma. Mentre gira non sporca la griglia: allo
        stop diventa un'attività da completare.
      </>
    ),
  },
  {
    title: "Aggiungi i dettagli solo dove servono",
    body: (
      <>
        «Più dettagli» apre l'editor completo: note, blocchi incontrati, prossimi
        passi, collaboratori, referenti, link, milestone. Un titolo e un orario
        sono già abbastanza — il resto è per il lavoro che vuoi ricordare.
      </>
    ),
  },
  {
    title: "Segna dove hai lavorato",
    body: (
      <>
        Dal pannello di destra scegli la sede del giorno: da remoto, in ufficio o
        dal cliente. Compare solo se hai attivato le presenze nelle Impostazioni.
      </>
    ),
  },
  {
    title: "A fine mese, apri il Riepilogo",
    body: (
      <>
        Ore totali, copertura delle giornate, presenze rispetto agli obiettivi e
        ripartizione per cliente. Da lì esporti il mese in Excel.
      </>
    ),
  },
];

const FEATURES: { name: string; body: string }[] = [
  {
    name: "Calendario",
    body: "Giorno, Settimana e Mese. I blocchi si creano, si spostano e si ridimensionano trascinando, con aggancio a 15 o 30 minuti. Tasto destro su un blocco per copiare, duplicare o salvarlo come template.",
  },
  {
    name: "Progetti",
    body: "Il lavoro è organizzato per cliente → progetto → sottotipo. Ogni progetto ha stato, obiettivi, team, ore stimate e sotto-attività, e mostra le ore consuntivate rispetto alla stima.",
  },
  {
    name: "Todo",
    body: "Cose da fare con sotto-attività, scadenza e progetto collegato. Quelle scadute o in scadenza compaiono da sole nella sidebar del Giorno.",
  },
  {
    name: "Presenze",
    body: "Sede del giorno e obiettivi percentuali (per esempio una quota minima in ufficio). Nel Mese ogni giorno porta l'icona della sede.",
  },
  {
    name: "Riepilogo ed export",
    body: "Sintesi del mese nella sidebar della vista Mese, con export in Excel. Passando su un cliente nella sidebar, i giorni corrispondenti si accendono nella griglia.",
  },
  {
    name: "Import da screenshot",
    body: "Incolla lo screenshot della cronologia chiamate di Teams: l'app lo legge sul dispositivo e abbozza le attività, sempre da rivedere prima di salvare.",
  },
  {
    name: "AI, se la vuoi",
    body: "Facoltativa e spenta di default, con la tua API key. Descrivi l'attività a parole e il quick-add compila i campi; sulle note propone una riscrittura da applicare o scartare. Nel dettaglio di un progetto, «Come va» legge le sue attività e dice a che punto sei, e lì sotto puoi fargli domande: il riassunto resta salvato e vedi i token spesi.",
  },
  {
    name: "Ricerca e backup",
    body: "La ricerca attraversa attività, progetti e todo. In Impostazioni → Dati esporti e reimporti l'intero archivio.",
  },
];

/**
 * Pannello «Come funziona»: il flusso di lavoro, le funzioni principali e le
 * scorciatoie. Le scorciatoie arrivano da `domain/keymap` (vedi `SHORTCUTS`),
 * così non possono raccontare tasti diversi da quelli che l'app ascolta.
 */
export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Come funziona Tabula"
      description="Il giro completo in due minuti."
      size="lg"
    >
      <div className="space-y-6 pt-4 text-sm leading-relaxed text-ink">
        <Section title="Il flusso di una giornata">
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-wash text-[11px] font-semibold text-accent"
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <strong className="font-medium">{s.title}.</strong>{" "}
                  <span className="text-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-lg bg-raised px-3 py-2 text-muted">
            Una volta sola, all'inizio: crea clienti e progetti in{" "}
            <strong className="font-medium text-ink">Progetti</strong> e i
            sottotipi con i loro colori in{" "}
            <strong className="font-medium text-ink">
              Impostazioni → Categorie
            </strong>
            . Senza anagrafica le ore non si possono attribuire a nessuno.
          </p>
        </Section>

        <Section title="Le funzioni">
          <dl className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.name}>
                <dt className="font-medium">{f.name}</dt>
                <dd className="text-muted">{f.body}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Scorciatoie">
          <div className="space-y-4">
            {GROUPS.map((g) => (
              <div key={g}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                  {g}
                </p>
                <ul className="space-y-1.5">
                  {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                    <li key={s.label} className="flex items-baseline gap-3">
                      <span className="flex shrink-0 items-baseline gap-1">
                        {s.press.map((p, i) => (
                          <Kbd key={i}>{keyLabel(p)}</Kbd>
                        ))}
                      </span>
                      <span className="text-muted">{s.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-muted">
              Nel riquadro di inserimento rapido: <Kbd>Invio</Kbd> salva,{" "}
              <Kbd>{isMac ? "⌘Invio" : "Ctrl+Invio"}</Kbd> fa interpretare la
              frase all'AI, <Kbd>Esc</Kbd> chiude. Le scorciatoie a lettera
              singola restano zitte mentre stai scrivendo in un campo.
            </p>
          </div>
        </Section>

        <Section title="Dove finiscono i dati">
          <p className="text-muted">
            Tutto resta nel browser, su questo dispositivo: niente account,
            niente server, niente statistiche d'uso. L'unica cosa che può uscire
            è quello che mandi tu all'AI, se l'hai attivata: il testo che le
            scrivi e, quando chiedi «Come va» su un progetto, le attività di
            quel progetto — senza i nomi di colleghi e referenti. Per lo stesso
            motivo, <strong className="font-medium text-ink">esporta ogni
            tanto</strong> da Impostazioni → Dati: se svuoti i dati del browser,
            l'archivio se ne va con loro.
          </p>
        </Section>
      </div>
    </Modal>
  );
}
