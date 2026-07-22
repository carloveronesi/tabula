# AI: miglioramento testo + sezione Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere a Tabula funzionalità AI BYO-key: una sezione Settings per key/modello/base URL e un bottone "Migliora" che riformula i testi liberi, a partire dalle Note attività.

**Architecture:** Un solo client `fetch` verso un endpoint OpenAI-compatible (`POST {baseUrl}/chat/completions`), base URL configurabile con preset. Una primitiva riusabile (`useAiRewrite` + `<AiField>`) attacca il flusso proponi→applica a qualunque campo di testo. Config persistita nel campo `ai` di `Settings` (IndexedDB).

**Tech Stack:** React + Vite + TypeScript + Tailwind, Zustand (store), Dexie/IndexedDB, Vitest + @testing-library/react. Nessuna dipendenza nuova.

## Global Constraints

- Tutti i comandi si eseguono da `app/` (`cd app`).
- Nessuna dipendenza npm nuova: solo `fetch` nativo.
- Testi UI in italiano; commit convenzionali in italiano con scope `ai` (es. `feat(ai): ...`).
- Path alias `@/` → `app/src/`.
- `npm run typecheck` e `npm test` devono restare verdi a fine di ogni task.
- La `apiKey` non deve mai finire nell'export né nei log.
- L'AI è opt-in: senza `ai.enabled` niente chiamate e nessun bottone visibile.

---

### Task 1: Modello dati `AiSettings` + default e migrazione

**Files:**
- Modify: `app/src/data/types.ts`
- Modify: `app/src/data/settings.ts`
- Test: `app/src/data/__tests__/settings.test.ts`

**Interfaces:**
- Produces: `interface AiSettings { enabled: boolean; baseUrl: string; apiKey: string; model: string }` esportata da `@/data/types`; `Settings.ai: AiSettings`; `DEFAULT_SETTINGS.ai` = `{ enabled: false, baseUrl: "", apiKey: "", model: "" }`. `migrateSettings` e `normalizeSettings` popolano sempre `ai`.

- [ ] **Step 1: Scrivi i test che falliscono** — in coda a `app/src/data/__tests__/settings.test.ts` aggiungi:

```ts
describe("ai settings default", () => {
  it("migrateSettings fornisce ai di default se assente", () => {
    const stored = { ...DEFAULT_SETTINGS } as Settings;
    delete (stored as { ai?: unknown }).ai;
    expect(migrateSettings(stored).ai).toEqual({
      enabled: false,
      baseUrl: "",
      apiKey: "",
      model: "",
    });
  });

  it("migrateSettings preserva un ai valido", () => {
    const stored = {
      ...DEFAULT_SETTINGS,
      ai: { enabled: true, baseUrl: "https://x/v1", apiKey: "k", model: "m" },
    } as Settings;
    expect(migrateSettings(stored).ai).toEqual({
      enabled: true,
      baseUrl: "https://x/v1",
      apiKey: "k",
      model: "m",
    });
  });

  it("normalizeSettings fornisce ai di default", () => {
    expect(normalizeSettings({}).ai).toEqual({
      enabled: false,
      baseUrl: "",
      apiKey: "",
      model: "",
    });
  });
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `cd app && npx vitest run src/data/__tests__/settings.test.ts`
Expected: FAIL (`ai` è `undefined`; `normalizeSettings(null)` non ha `ai`).

- [ ] **Step 3: Aggiungi il tipo** — in `app/src/data/types.ts`, dopo `export interface Settings {`… aggiungi il campo e definisci l'interfaccia:

```ts
export interface AiSettings {
  enabled: boolean;
  baseUrl: string; // es. "https://api.openai.com/v1"
  apiKey: string; // in chiaro nel DB locale (nessun server)
  model: string; // id modello, inserito dall'utente
}
```

E dentro `interface Settings { … }` aggiungi la riga:

```ts
  ai: AiSettings;
```

- [ ] **Step 4: Aggiorna default e coercizione** — in `app/src/data/settings.ts`:

In `DEFAULT_SETTINGS`, aggiungi come ultimo campo:

```ts
  ai: { enabled: false, baseUrl: "", apiKey: "", model: "" },
```

Aggiungi un helper vicino agli altri (`num`, `stringRecord`):

```ts
function aiSettings(value: unknown): Settings["ai"] {
  const o = asObject(value);
  return {
    enabled: o.enabled === true,
    baseUrl: typeof o.baseUrl === "string" ? o.baseUrl : "",
    apiKey: typeof o.apiKey === "string" ? o.apiKey : "",
    model: typeof o.model === "string" ? o.model : "",
  };
}
```

In `migrateSettings`, nel return, aggiungi accanto a `subtypes`:

```ts
    ai: aiSettings((stored as { ai?: unknown }).ai),
```

In `normalizeSettings`, nel return, aggiungi come ultimo campo (prima della chiusura):

```ts
    ai: aiSettings(s.ai),
```

- [ ] **Step 5: Esegui test e typecheck**

Run: `cd app && npx vitest run src/data/__tests__/settings.test.ts && npm run typecheck`
Expected: PASS (test), typecheck OK.

- [ ] **Step 6: Commit**

```bash
git add app/src/data/types.ts app/src/data/settings.ts app/src/data/__tests__/settings.test.ts
git commit -m "feat(ai): campo AiSettings con default e migrazione"
```

---

### Task 2: Escludi `apiKey` dall'export

**Files:**
- Modify: `app/src/data/export/buildExport.ts:52-67`
- Test: `app/src/data/export/__tests__/buildExport.test.ts`

**Interfaces:**
- Consumes: `AiSettings` (Task 1).
- Produces: `buildExport` che azzera `ai.apiKey` nel documento esportato (le altre chiavi `ai` restano).

- [ ] **Step 1: Scrivi il test che fallisce** — in coda a `app/src/data/export/__tests__/buildExport.test.ts` aggiungi:

```ts
it("non esporta la apiKey dell'AI", () => {
  const data = emptyExportData();
  data.settings = {
    ...DEFAULT_SETTINGS,
    ai: { enabled: true, baseUrl: "https://x/v1", apiKey: "segreto", model: "m" },
  };
  const doc = buildExport(data, 0);
  expect(doc.settings?.ai.apiKey).toBe("");
  expect(doc.settings?.ai.baseUrl).toBe("https://x/v1");
});
```

Assicurati che gli import in cima al file includano `emptyExportData`, `buildExport` (già presenti) e `DEFAULT_SETTINGS` da `@/data/settings` (aggiungilo se manca).

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `cd app && npx vitest run src/data/export/__tests__/buildExport.test.ts`
Expected: FAIL (`apiKey` è `"segreto"`).

- [ ] **Step 3: Sanifica in `buildExport`** — in `app/src/data/export/buildExport.ts`, sostituisci nel return `settings: data.settings,` con:

```ts
    settings:
      data.settings === null
        ? null
        : { ...data.settings, ai: { ...data.settings.ai, apiKey: "" } },
```

- [ ] **Step 4: Esegui test e typecheck**

Run: `cd app && npx vitest run src/data/export/__tests__/buildExport.test.ts && npm run typecheck`
Expected: PASS + typecheck OK.

- [ ] **Step 5: Commit**

```bash
git add app/src/data/export/buildExport.ts app/src/data/export/__tests__/buildExport.test.ts
git commit -m "feat(ai): escludi la apiKey dall'export"
```

---

### Task 3: Client `chat` + preset provider

**Files:**
- Create: `app/src/domain/ai/client.ts`
- Test: `app/src/domain/ai/__tests__/client.test.ts`

**Interfaces:**
- Consumes: `AiSettings` (Task 1).
- Produces:
  - `type AiMessage = { role: "system" | "user"; content: string }`
  - `async function chat(cfg: AiSettings, messages: AiMessage[], signal?: AbortSignal): Promise<string>` — ritorna il testo di `choices[0].message.content`, o lancia `Error` con messaggio in italiano.
  - `const AI_PRESETS: { id: string; label: string; baseUrl: string; modelPlaceholder: string }[]`.

- [ ] **Step 1: Scrivi i test che falliscono** — crea `app/src/domain/ai/__tests__/client.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { chat } from "@/domain/ai/client";
import type { AiSettings } from "@/data/types";

const cfg: AiSettings = {
  enabled: true,
  baseUrl: "https://x/v1",
  apiKey: "k",
  model: "m",
};

afterEach(() => vi.restoreAllMocks());

function mockFetch(impl: () => Promise<Response> | Response) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("chat", () => {
  it("estrae il content dalla risposta", async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "ciao" } }] }),
        { status: 200 },
      ),
    );
    await expect(chat(cfg, [{ role: "user", content: "x" }])).resolves.toBe("ciao");
  });

  it("401 → messaggio sulla key", async () => {
    mockFetch(() => new Response("", { status: 401 }));
    await expect(chat(cfg, [{ role: "user", content: "x" }])).rejects.toThrow(/key/i);
  });

  it("errore di rete → messaggio sul provider", async () => {
    mockFetch(() => Promise.reject(new TypeError("network")));
    await expect(chat(cfg, [{ role: "user", content: "x" }])).rejects.toThrow(
      /provider|rag/i,
    );
  });

  it("risposta 200 malformata → risposta non valida", async () => {
    mockFetch(() => new Response(JSON.stringify({ nope: true }), { status: 200 }));
    await expect(chat(cfg, [{ role: "user", content: "x" }])).rejects.toThrow(
      /valida/i,
    );
  });

  it("propaga AbortError", async () => {
    mockFetch(() => Promise.reject(new DOMException("aborted", "AbortError")));
    await expect(chat(cfg, [{ role: "user", content: "x" }])).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `cd app && npx vitest run src/domain/ai/__tests__/client.test.ts`
Expected: FAIL (modulo inesistente).

- [ ] **Step 3: Implementa il client** — crea `app/src/domain/ai/client.ts`:

```ts
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
```

- [ ] **Step 4: Esegui test e typecheck**

Run: `cd app && npx vitest run src/domain/ai/__tests__/client.test.ts && npm run typecheck`
Expected: PASS + typecheck OK.

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/ai/client.ts app/src/domain/ai/__tests__/client.test.ts
git commit -m "feat(ai): client OpenAI-compatible via fetch con preset"
```

---

### Task 4: Hook `useAiRewrite`

**Files:**
- Create: `app/src/features/ai/useAiRewrite.ts`
- Test: `app/src/features/ai/__tests__/useAiRewrite.test.ts`

**Interfaces:**
- Consumes: `chat`, `AiMessage` (Task 3); `useSettingsStore` (`@/store/settings`).
- Produces:
  - `type RewriteState = { status: "idle" } | { status: "loading" } | { status: "ready"; proposal: string } | { status: "error"; message: string }`
  - `function useAiRewrite(systemPrompt: string): { state: RewriteState; run: (text: string) => void; reset: () => void; enabled: boolean }`

- [ ] **Step 1: Scrivi i test che falliscono** — crea `app/src/features/ai/__tests__/useAiRewrite.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAiRewrite } from "@/features/ai/useAiRewrite";
import { useSettingsStore } from "@/store/settings";
import { DEFAULT_SETTINGS } from "@/data/settings";

vi.mock("@/domain/ai/client", () => ({
  chat: vi.fn(),
}));
import { chat } from "@/domain/ai/client";

function enableAi() {
  useSettingsStore.setState({
    settings: {
      ...DEFAULT_SETTINGS,
      ai: { enabled: true, baseUrl: "https://x/v1", apiKey: "k", model: "m" },
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
});

describe("useAiRewrite", () => {
  it("enabled riflette ai.enabled", () => {
    const { result } = renderHook(() => useAiRewrite("sys"));
    expect(result.current.enabled).toBe(false);
    act(enableAi);
    const { result: r2 } = renderHook(() => useAiRewrite("sys"));
    expect(r2.current.enabled).toBe(true);
  });

  it("idle → loading → ready con la proposta", async () => {
    enableAi();
    (chat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue("riscritto");
    const { result } = renderHook(() => useAiRewrite("sys"));
    act(() => result.current.run("originale"));
    expect(result.current.state.status).toBe("loading");
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "ready", proposal: "riscritto" }),
    );
  });

  it("errore del client → stato error con messaggio", async () => {
    enableAi();
    (chat as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useAiRewrite("sys"));
    act(() => result.current.run("x"));
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error", message: "boom" }),
    );
  });

  it("reset torna a idle", async () => {
    enableAi();
    (chat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue("y");
    const { result } = renderHook(() => useAiRewrite("sys"));
    act(() => result.current.run("x"));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    act(() => result.current.reset());
    expect(result.current.state.status).toBe("idle");
  });
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `cd app && npx vitest run src/features/ai/__tests__/useAiRewrite.test.ts`
Expected: FAIL (modulo inesistente).

- [ ] **Step 3: Implementa l'hook** — crea `app/src/features/ai/useAiRewrite.ts`:

```ts
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
```

- [ ] **Step 4: Esegui test e typecheck**

Run: `cd app && npx vitest run src/features/ai/__tests__/useAiRewrite.test.ts && npm run typecheck`
Expected: PASS + typecheck OK.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/ai/useAiRewrite.ts app/src/features/ai/__tests__/useAiRewrite.test.ts
git commit -m "feat(ai): hook useAiRewrite (macchina a stati proponi/applica)"
```

---

### Task 5: Componente `<AiField>` + icona `IconSparkles`

**Files:**
- Modify: `app/src/ui/icons.tsx`
- Create: `app/src/features/ai/AiField.tsx`
- Test: `app/src/features/ai/__tests__/AiField.test.tsx`

**Interfaces:**
- Consumes: `useAiRewrite` (Task 4), `Button` (`@/ui`), `Icons.IconSparkles` (nuova).
- Produces:
  - `export const IconSparkles` in `@/ui/icons`.
  - `function AiField(props: { value: string; systemPrompt: string; onApply: (proposal: string) => void }): JSX.Element | null` — mostra il bottone "Migliora" solo se `enabled`; gestisce loading/ready/error; su Applica chiama `onApply` e fa reset.

- [ ] **Step 1: Scrivi i test che falliscono** — crea `app/src/features/ai/__tests__/AiField.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AiField } from "@/features/ai/AiField";
import { useSettingsStore } from "@/store/settings";
import { DEFAULT_SETTINGS } from "@/data/settings";

vi.mock("@/domain/ai/client", () => ({ chat: vi.fn() }));
import { chat } from "@/domain/ai/client";

function enableAi() {
  useSettingsStore.setState({
    settings: {
      ...DEFAULT_SETTINGS,
      ai: { enabled: true, baseUrl: "https://x/v1", apiKey: "k", model: "m" },
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
});

describe("AiField", () => {
  it("non mostra nulla se l'AI è disattiva", () => {
    const { container } = render(
      <AiField value="x" systemPrompt="sys" onApply={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("Migliora → Applica chiama onApply con la proposta", async () => {
    enableAi();
    (chat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue("riscritto");
    const onApply = vi.fn();
    render(<AiField value="originale" systemPrompt="sys" onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: /migliora/i }));
    await waitFor(() => screen.getByText("riscritto"));
    fireEvent.click(screen.getByRole("button", { name: /applica/i }));
    expect(onApply).toHaveBeenCalledWith("riscritto");
  });
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `cd app && npx vitest run src/features/ai/__tests__/AiField.test.tsx`
Expected: FAIL (modulo/icona inesistenti).

- [ ] **Step 3: Aggiungi l'icona** — in `app/src/ui/icons.tsx`, in coda alle altre icone, aggiungi:

```tsx
export const IconSparkles = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" />
    <path d="M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14Z" />
  </Svg>
);
```

- [ ] **Step 4: Implementa il componente** — crea `app/src/features/ai/AiField.tsx`:

```tsx
import { Button, Icons } from "@/ui";
import { useAiRewrite } from "@/features/ai/useAiRewrite";

/**
 * Attacca il flusso AI "proponi riscrittura → applica/scarta" a un campo di
 * testo. Inerte (non renderizza nulla) se l'AI non è attiva nei Settings.
 */
export function AiField({
  value,
  systemPrompt,
  onApply,
}: {
  value: string;
  systemPrompt: string;
  onApply: (proposal: string) => void;
}) {
  const { state, run, reset, enabled } = useAiRewrite(systemPrompt);
  if (!enabled) return null;

  return (
    <div className="mt-2 space-y-2">
      {state.status !== "ready" && (
        <Button
          variant="ghost"
          onClick={() => run(value)}
          disabled={state.status === "loading" || value.trim() === ""}
        >
          <Icons.IconSparkles size={16} />
          {state.status === "loading" ? "Sto migliorando…" : "Migliora"}
        </Button>
      )}

      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      {state.status === "ready" && (
        <div className="space-y-2 rounded-lg border border-line bg-raised p-3">
          <p className="whitespace-pre-wrap text-sm text-ink">{state.proposal}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => {
                onApply(state.proposal);
                reset();
              }}
            >
              Applica
            </Button>
            <Button variant="ghost" onClick={reset}>
              Scarta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Esegui test e typecheck**

Run: `cd app && npx vitest run src/features/ai/__tests__/AiField.test.tsx && npm run typecheck`
Expected: PASS + typecheck OK.

- [ ] **Step 6: Commit**

```bash
git add app/src/ui/icons.tsx app/src/features/ai/AiField.tsx app/src/features/ai/__tests__/AiField.test.tsx
git commit -m "feat(ai): componente AiField (proponi/applica) e icona sparkles"
```

---

### Task 6: Sezione Settings "AI" + nav + frase privacy

**Files:**
- Create: `app/src/features/settings/sections/AiSettings.tsx`
- Modify: `app/src/features/settings/SettingsView.tsx`
- Test: `app/src/features/settings/sections/__tests__/AiSettings.test.tsx`

**Interfaces:**
- Consumes: `useSettingsStore`, `AI_PRESETS`/`chat` (Task 3), `Icons.IconSparkles` (Task 5), primitivi `@/ui` (`Field`, `Input`, `Segmented`, `Button`, `Combobox`), `SettingsSection`.
- Produces: `export function AiSettings()`; nuova voce nav `"ai"` in `SettingsView`.

- [ ] **Step 1: Scrivi il test che fallisce** — crea `app/src/features/settings/sections/__tests__/AiSettings.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AiSettings } from "@/features/settings/sections/AiSettings";
import { useSettingsStore } from "@/store/settings";
import { DEFAULT_SETTINGS } from "@/data/settings";

afterEach(() => useSettingsStore.setState({ settings: DEFAULT_SETTINGS }));

describe("AiSettings", () => {
  it("attivare l'AI salva enabled=true nello store", () => {
    render(<AiSettings />);
    fireEvent.click(screen.getByRole("button", { name: /^attiva$/i }));
    expect(useSettingsStore.getState().settings.ai.enabled).toBe(true);
  });

  it("scrivere la base URL la salva nello store", () => {
    render(<AiSettings />);
    const input = screen.getByLabelText(/base url/i);
    fireEvent.change(input, { target: { value: "https://api.openai.com/v1" } });
    expect(useSettingsStore.getState().settings.ai.baseUrl).toBe(
      "https://api.openai.com/v1",
    );
  });
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `cd app && npx vitest run src/features/settings/sections/__tests__/AiSettings.test.tsx`
Expected: FAIL (modulo inesistente).

- [ ] **Step 3: Implementa la sezione** — crea `app/src/features/settings/sections/AiSettings.tsx`:

```tsx
import { useState } from "react";
import { useSettingsStore } from "@/store/settings";
import { Button, Field, Input, Segmented } from "@/ui";
import { SettingsSection } from "@/features/settings/SettingsSection";
import { AI_PRESETS, chat } from "@/domain/ai/client";
import type { AiSettings as AiSettingsT } from "@/data/types";

/** Configurazione AI (BYO-key). Nessun dato lascia il browser finché non usi
 * esplicitamente l'AR; la key resta locale. */
export function AiSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const ai = settings.ai;
  const patch = (p: Partial<AiSettingsT>) =>
    void saveSettings({ ...settings, ai: { ...ai, ...p } });

  const [test, setTest] = useState<
    { status: "idle" | "loading" } | { status: "done"; ok: boolean; message: string }
  >({ status: "idle" });

  async function testConnection() {
    setTest({ status: "loading" });
    try {
      await chat(ai, [{ role: "user", content: "ping" }]);
      setTest({ status: "done", ok: true, message: "Connessione riuscita." });
    } catch (e) {
      setTest({
        status: "done",
        ok: false,
        message: e instanceof Error ? e.message : "Errore imprevisto.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="AI"
        description="Configura un provider AI con la tua API key per migliorare i testi. Quando l'AI è attiva, il testo che scegli di migliorare viene inviato al provider selezionato; tutto il resto resta sul dispositivo."
      >
        <Segmented
          label="Attivazione AI"
          value={ai.enabled ? "on" : "off"}
          onChange={(id) => patch({ enabled: id === "on" })}
          options={[
            { id: "on", label: "Attiva" },
            { id: "off", label: "Disattiva" },
          ]}
        />

        <Field label="Preset provider">
          <Segmented
            label="Preset provider"
            value={
              AI_PRESETS.find((p) => p.baseUrl === ai.baseUrl)?.id ?? "custom"
            }
            onChange={(id) => {
              const preset = AI_PRESETS.find((p) => p.id === id);
              if (preset) patch({ baseUrl: preset.baseUrl });
            }}
            options={AI_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
          />
        </Field>

        <Field label="Base URL">
          <Input
            aria-label="Base URL"
            value={ai.baseUrl}
            onChange={(e) => patch({ baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </Field>

        <Field label="API key">
          <Input
            aria-label="API key"
            type="password"
            value={ai.apiKey}
            onChange={(e) => patch({ apiKey: e.target.value })}
            placeholder="sk-…"
          />
        </Field>

        <Field label="Modello">
          <Input
            aria-label="Modello"
            value={ai.model}
            onChange={(e) => patch({ model: e.target.value })}
            placeholder="gpt-4o-mini"
          />
        </Field>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => void testConnection()}
            disabled={test.status === "loading" || !ai.baseUrl || !ai.apiKey || !ai.model}
          >
            {test.status === "loading" ? "Provo…" : "Prova connessione"}
          </Button>
          {test.status === "done" && (
            <span
              role="status"
              className={test.ok ? "text-sm text-accent" : "text-sm text-danger"}
            >
              {test.message}
            </span>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
```

- [ ] **Step 4: Aggiungi la sezione alla nav** — in `app/src/features/settings/SettingsView.tsx`:

Import: aggiungi `IconSparkles` all'elenco importato da `@/ui/icons`, e la sezione:

```tsx
import { AiSettings } from "@/features/settings/sections/AiSettings";
```

Nel tipo `SectionId`, aggiungi `| "ai"`. Nell'array `SECTIONS`, aggiungi come ultima voce prima di `data` (o in coda, a scelta di layout):

```tsx
  { id: "ai", label: "AI", Icon: IconSparkles },
```

Nel corpo, aggiungi il render condizionale accanto agli altri:

```tsx
          {active === "ai" && <AiSettings />}
```

- [ ] **Step 5: Ammorbidisci la frase privacy** — in `app/src/features/settings/SettingsView.tsx`, sostituisci il testo del paragrafo header:

```tsx
        <p className="mt-1 text-sm text-muted">
          I tuoi dati restano sul dispositivo. L'AI, se la attivi, invia solo il
          testo che scegli al provider che indichi tu.
        </p>
```

- [ ] **Step 6: Esegui test e typecheck**

Run: `cd app && npx vitest run src/features/settings/sections/__tests__/AiSettings.test.tsx && npm run typecheck`
Expected: PASS + typecheck OK.

- [ ] **Step 7: Commit**

```bash
git add app/src/features/settings/sections/AiSettings.tsx app/src/features/settings/SettingsView.tsx app/src/features/settings/sections/__tests__/AiSettings.test.tsx
git commit -m "feat(ai): sezione Settings AI e frase privacy aggiornata"
```

---

### Task 7: Collega `<AiField>` alle Note dell'editor attività

**Files:**
- Modify: `app/src/features/calendar/EntryEditor.tsx:591-600`

**Interfaces:**
- Consumes: `AiField` (Task 5). Usa `draft.notes` come `value` e `patch({ notes })` come `onApply`.

- [ ] **Step 1: Aggiungi l'import** — in cima a `app/src/features/calendar/EntryEditor.tsx`, tra gli import di feature, aggiungi:

```ts
import { AiField } from "@/features/ai/AiField";
```

- [ ] **Step 2: Inserisci il componente sotto le Note** — nel blocco `<Field label="Note" …>`, subito dopo la chiusura di `</MarkdownEditor>` e prima di `</Field>`, aggiungi:

```tsx
              <AiField
                value={draft.notes}
                systemPrompt="Riformula queste note di lavoro rendendole chiare e concise. Mantieni la stessa lingua e non inventare fatti. Rispondi solo con il testo riformulato, senza preamboli."
                onApply={(notes) => patch({ notes })}
              />
```

- [ ] **Step 3: Verifica manuale + typecheck + suite**

Run: `cd app && npm run typecheck && npm test`
Expected: typecheck OK; l'intera suite Vitest verde.

- [ ] **Step 4: Prova nell'app (facoltativa ma consigliata)**

Run: `cd app && npm run dev` → apri i Settings, sezione AI, attiva e inserisci key/modello reali → apri una attività → sotto le Note compare "Migliora" → provalo.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/calendar/EntryEditor.tsx
git commit -m "feat(ai): bottone Migliora sulle Note dell'attività"
```

---

## Self-Review

- **Copertura spec:** modello dati `ai` (Task 1), export senza key (Task 2), client + preset (Task 3), primitiva `useAiRewrite`+`AiField` (Task 4–5), sezione Settings + nav + privacy (Task 6), primo uso su Note (Task 7). Test per client/hook/settings/export/AiField come da spec. ✓
- **Riuso futuro:** `<AiField>` è pronto per Descrizione/Obiettivi progetto e altri campi (non costruiti ora, come da spec). ✓
- **Placeholder:** nessuno; ogni step ha codice o comando concreto.
- **Coerenza tipi:** `AiSettings` (Task 1) usato da client (Task 3), hook (Task 4), sezione (Task 6); `RewriteState`/`useAiRewrite` (Task 4) usati da `AiField` (Task 5); `AI_PRESETS`/`chat` (Task 3) usati da Task 6. `IconSparkles` definita in Task 5, usata in Task 5 e 6.

## Note sui test runner

- I test elencano `npx vitest run <file>`; a fine piano `npm test` gira l'intera suite.
- I test componente usano `@testing-library/react` (già in uso nel repo, es. `SettingsView.test.tsx`).
