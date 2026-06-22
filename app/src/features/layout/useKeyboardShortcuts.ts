import { useEffect, useRef } from "react";
import { initialKeyState, resolveKey, type KeyState } from "@/domain/keymap";
import { isoDate } from "@/domain/calendarNav";
import { useUiStore } from "@/store";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { useToastStore } from "@/store/toast";
import { toggleTimer } from "@/features/layout/timerActions";
import { pasteEntry } from "@/features/layout/clipboardActions";

/** Il bersaglio dell'evento è un campo editabile (lì vince il comportamento nativo). */
function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable
  );
}

/**
 * Scorciatoie globali da tastiera (vedi `domain/keymap`): undo/redo, `g d/w/m`
 * per cambiare vista, Ctrl/Cmd+K per la Ricerca, `n` per una nuova attività,
 * `t` per avviare/fermare il timer.
 * Disattive quando il focus è in un campo testo o l'editor è aperto, così non
 * interferiscono con la digitazione.
 */
export function useKeyboardShortcuts(): void {
  const keyState = useRef<KeyState>(initialKeyState);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target) || useEditorStore.getState().open) return;
      // Lascia passare i modificatori "di sistema" che non gestiamo.
      if (e.altKey) return;

      const { state, action } = resolveKey(keyState.current, e);
      keyState.current = state;
      if (!action) return;

      // Copia: solo se un dettaglio è aperto e non c'è testo selezionato,
      // altrimenti lascia vincere la copia nativa del browser.
      if (action.type === "copy") {
        const detail = useEditorStore.getState().detail;
        const hasSelection = (window.getSelection()?.toString() ?? "") !== "";
        if (!detail || hasSelection) return;
        e.preventDefault();
        useEditorStore.getState().copyEntry(detail);
        useToastStore.getState().notify("Attività copiata");
        return;
      }
      if (action.type === "paste") {
        e.preventDefault();
        void pasteEntry();
        return;
      }

      e.preventDefault();
      const ui = useUiStore.getState();
      switch (action.type) {
        case "undo":
          void useCalendarStore.getState().undo();
          break;
        case "redo":
          void useCalendarStore.getState().redo();
          break;
        case "view":
          ui.setView(action.view);
          break;
        case "new":
          useEditorStore.getState().openCreate({
            date: isoDate(ui.activeDate),
            startMin: 540,
            endMin: 600,
          });
          break;
        case "timer":
          void toggleTimer();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
