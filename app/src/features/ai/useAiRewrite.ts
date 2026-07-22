import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/store/settings";
import { chat } from "@/domain/ai/client";

export type RewriteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; proposal: string }
  | { status: "error"; message: string };

/**
 * Flusso "proponi riscrittura" per un campo di testo: chiama il client con un
 * system prompt specifico del campo e mantiene la macchina a stati. La proposta
 * non tocca il campo: la applica il chiamante su `accept`.
 */
export function useAiRewrite(systemPrompt: string) {
  const settings = useSettingsStore((s) => s.settings.ai);
  const [state, setState] = useState<RewriteState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  function run(text: string) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ status: "loading" });
    chat(
      settings,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      ctrl.signal,
    )
      .then((proposal) => {
        if (!ctrl.signal.aborted) setState({ status: "ready", proposal });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        const message = e instanceof Error ? e.message : "Errore imprevisto.";
        setState({ status: "error", message });
      });
  }

  function reset() {
    abortRef.current?.abort();
    setState({ status: "idle" });
  }

  return { state, run, reset, enabled: settings.enabled };
}
