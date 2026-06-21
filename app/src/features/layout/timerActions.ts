import { useTimerStore } from "@/store/timer";
import { useEditorStore } from "@/store/editor";
import { useSettingsStore } from "@/store/settings";
import { timerSeed } from "@/domain/timer";

/**
 * Azione "toggle" del timer, condivisa da bottone e scorciatoia: se fermo lo
 * avvia; se in corso lo ferma e apre l'editor pre-compilato con la fascia
 * (arrotondata allo slot), da rivedere. Legge gli store via `getState` così è
 * robusta a click/tasti ravvicinati e usabile fuori da un componente.
 */
export async function toggleTimer(): Promise<void> {
  const timer = useTimerStore.getState();
  if (timer.startedAt === null) {
    await timer.start();
    return;
  }
  const span = await timer.stop();
  if (!span) return;
  const slot = useSettingsStore.getState().settings.slotMinutes;
  useEditorStore
    .getState()
    .openCreate(timerSeed(span.startedAt, span.stoppedAt, slot));
}
