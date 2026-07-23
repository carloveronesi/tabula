import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/store/settings";
import { chat, type AiMessage } from "@/domain/ai/client";

/**
 * Conversazione a turni su un contesto fisso. `system()` viene chiamata a ogni
 * domanda, non alla creazione: il contesto è il consuntivo del progetto, che
 * cambia mentre lavori, e una chat che risponde su dati vecchi è peggio di una
 * che non risponde.
 *
 * ponytail: il thread vive in memoria e muore col componente. La cosa che vale
 * la pena salvare è il riassunto, non tre domande di ieri; se serve, si salva
 * accanto ad `aiSummary`.
 */
export function useAiChat(system: () => string) {
  const settings = useSettingsStore((s) => s.settings.ai);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  function ask(text: string) {
    const question = text.trim();
    if (question === "" || busy) return;
    const thread: AiMessage[] = [...messages, { role: "user", content: question }];
    setMessages(thread);
    setError(null);
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    chat(
      settings,
      [{ role: "system", content: system() }, ...thread],
      ctrl.signal,
    )
      .then(({ text: answer, usage }) => {
        if (ctrl.signal.aborted) return;
        if (usage) setTokens((t) => t + usage.in + usage.out);
        setMessages([...thread, { role: "assistant", content: answer }]);
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Errore imprevisto.");
        // La domanda resta nel thread ma senza risposta: rimandarla creerebbe
        // due turni "user" di fila, che i provider rifiutano.
        setMessages(messages);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setBusy(false);
      });
  }

  return { messages, ask, busy, error, tokens, enabled: settings.enabled };
}
