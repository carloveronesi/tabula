import { useEffect, useRef, useState } from "react";
import { useTimerStore } from "@/store/timer";
import { toggleTimer } from "@/features/layout/timerActions";
import { elapsedLabel } from "@/domain/timer";
import { Button, cn, IconButton, Icons } from "@/ui";

/**
 * Controllo del timer "in corso" nella TopBar. Da fermo: un pulsante "Timer".
 * Mentre gira: il tempo trascorso che scorre (aggiornato ogni secondo) con stop
 * e annulla, e l'orario riflesso nel titolo della tab. Avvio/stop passano da
 * `toggleTimer` (condiviso con la scorciatoia `t`); lo stop apre l'editor.
 */
export function TimerControl() {
  const startedAt = useTimerStore((s) => s.startedAt);
  const cancel = useTimerStore((s) => s.cancel);

  const running = startedAt !== null;

  // Tick al secondo solo mentre il timer gira (deriva il trascorso da `now`).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Riflette il tempo trascorso nel titolo della tab (utile con la PWA di lato).
  const baseTitle = useRef(document.title);
  useEffect(() => {
    document.title =
      running && startedAt !== null
        ? `⏱ ${elapsedLabel(now - startedAt)} · ${baseTitle.current}`
        : baseTitle.current;
  }, [now, running, startedAt]);
  useEffect(() => {
    const base = baseTitle.current;
    return () => {
      document.title = base;
    };
  }, []);

  if (!running) {
    return (
      <Button
        variant="subtle"
        size="sm"
        onClick={() => void toggleTimer()}
        title="Avvia timer (t)"
      >
        <Icons.IconPlay size={15} />
        Timer
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-pill border border-primary bg-primary-wash",
        "py-0.5 pl-2.5 pr-1 text-accent shadow-sm",
      )}
    >
      <span
        aria-hidden
        className="h-2 w-2 rounded-full bg-accent motion-safe:animate-pulse"
      />
      <span className="tnum text-sm font-semibold">
        {elapsedLabel(now - startedAt!)}
      </span>
      <Button
        variant="primary"
        size="sm"
        className="ml-1 h-7 px-2.5"
        onClick={() => void toggleTimer()}
        title="Ferma e salva (t)"
      >
        <Icons.IconStop size={14} />
        Ferma
      </Button>
      <IconButton
        label="Annulla timer"
        title="Annulla timer"
        size="sm"
        className="h-7 w-7"
        onClick={() => void cancel()}
      >
        <Icons.IconClose size={15} />
      </IconButton>
    </div>
  );
}
