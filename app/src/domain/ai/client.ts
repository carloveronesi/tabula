import type { AiSettings } from "@/data/types";

export type AiMessage = { role: "system" | "user"; content: string };

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
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model, messages }),
      signal,
    });
  } catch (e) {
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
  return content;
}
