import { useEffect, useState } from "react";
import { useTimerStore } from "@/store/timer";
import { useEditorStore } from "@/store/editor";
import { useSettingsStore } from "@/store/settings";
import { elapsedLabel, timerSeed } from "@/domain/timer";
import { Button, cn, IconButton, Icons } from "@/ui";

/**
 * Controllo del timer "in corso" nella TopBar. Da fermo: un pulsante "Avvia".
 * Mentre gira: il tempo trascorso che scorre (aggiornato ogni secondo) con stop
 * e annulla. Lo stop pre-compila l'editor con la fascia calcolata, da rivedere.
 */
export function TimerControl() {
  const startedAt = useTimerStore((s) => s.startedAt);
  const start = useTimerStore((s) => s.start);
  const stop = useTimerStore((s) => s.stop);
  const cancel = useTimerStore((s) => s.cancel);
  const openCreate = useEditorStore((s) => s.openCreate);
  const slotMinutes = useSettingsStore((s) => s.settings.slotMinutes);

  const running = startedAt !== null;

  // Tick al secondo solo mentre il timer gira (deriva il trascorso da `now`).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const onStop = async () => {
    const span = await stop();
    if (!span) return;
    openCreate(timerSeed(span.startedAt, span.stoppedAt, slotMinutes));
  };

  if (!running) {
    return (
      <Button
        variant="subtle"
        size="sm"
        onClick={() => void start()}
        title="Avvia timer"
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
        onClick={() => void onStop()}
        title="Ferma e salva"
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
