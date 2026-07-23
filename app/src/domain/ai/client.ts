import type { AiSettings } from "@/data/types";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Token dichiarati dal provider per una chiamata. */
export interface AiUsage {
  in: number;
  out: number;
}

export interface AiReply {
  text: string;
  /** `null` se il provider non li dichiara: meglio nessun numero che uno finto. */
  usage: AiUsage | null;
}

/**
 * ponytail: nessuna stima locale dei token quando il provider tace, e nessuna
 * conversione in euro: i prezzi per modello sono una tabella che invecchia da
 * sola, e qui il modello lo scegli tu.
 */
function readUsage(data: unknown): AiUsage | null {
  const u = (data as { usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } })
    ?.usage;
  return typeof u?.prompt_tokens === "number" && typeof u?.completion_tokens === "number"
    ? { in: u.prompt_tokens, out: u.completion_tokens }
    : null;
}

export const AI_PRESETS: {
  id: string;
  label: string;
  baseUrl: string;
  modelPlaceholder: string;
}[] = [
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", modelPlaceholder: "gpt-4o-mini" },
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", modelPlaceholder: "openai/gpt-4o-mini" },
  { id: "gemini", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", modelPlaceholder: "gemini-2.0-flash" },
  { id: "custom", label: "Personalizzato", baseUrl: "", modelPlaceholder: "" },
];

/**
 * Una sola chiamata a un endpoint OpenAI-compatible. Provider-neutral: cambia
 * la base URL e cambi provider. Errori tradotti in messaggi leggibili.
 * ponytail: no streaming; aggiungere solo se un singolo "riscrivi" (testo
 * breve) diventa lento davvero.
 */
export async function chat(
  cfg: AiSettings,
  messages: AiMessage[],
  signal?: AbortSignal,
  timeoutMs = 30_000,
): Promise<AiReply> {
  // Senza configurazione la richiesta partirebbe verso un URL relativo, l'app
  // risponderebbe con la propria index.html e l'errore finale sarebbe "risposta
  // non valida dal provider": un vicolo cieco che punta al posto sbagliato.
  if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
    throw new Error(
      "AI non configurata: controlla base URL, API key e modello nelle Impostazioni.",
    );
  }

  // Un solo controller per il timeout e per l'annullamento del chiamante:
  // AbortSignal.any() farebbe lo stesso in due righe, ma non c'è su Safari < 17.4
  // (né in jsdom) e lì fallirebbe *dentro* la fetch, travestito da errore di rete.
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal?.aborted) ctrl.abort(); // già annullato: niente chiamata inutile
  signal?.addEventListener("abort", onAbort);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);

  try {
    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({ model: cfg.model, messages }),
        signal: ctrl.signal,
      });
    } catch (e) {
      // Prima dell'AbortError: uno scadere non va scambiato per un annullamento
      // dell'utente, altrimenti chi chiama lo ignora e resta in loading per sempre.
      if (timedOut) {
        throw new Error("Il provider non ha risposto in tempo. Riprova.");
      }
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      throw new Error("Impossibile raggiungere il provider AI. Controlla la connessione e la base URL.");
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error("API key non valida o senza permessi.");
    }
    if (!res.ok) {
      throw new Error(`Il provider ha risposto con errore (${res.status}).`);
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error("Risposta non valida dal provider.");
    }
    const content = (data as { choices?: { message?: { content?: unknown } }[] })
      ?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Risposta non valida dal provider.");
    }
    return { text: content, usage: readUsage(data) };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
