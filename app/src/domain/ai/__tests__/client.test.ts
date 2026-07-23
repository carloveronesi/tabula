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

function mockFetch(
  impl: (url?: string, init?: RequestInit) => Promise<Response> | Response,
) {
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

  // Regressione: con AbortSignal.any() questa combinazione esplodeva su Safari
  // < 17.4 e in jsdom, travestita da errore di rete.
  it("funziona anche quando il chiamante passa un signal", async () => {
    mockFetch(() =>
      new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
        status: 200,
      }),
    );
    const ctrl = new AbortController();
    await expect(
      chat(cfg, [{ role: "user", content: "x" }], ctrl.signal),
    ).resolves.toBe("ok");
  });

  it("il signal del chiamante annulla la richiesta", async () => {
    mockFetch(
      (_url?: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const ctrl = new AbortController();
    const p = chat(cfg, [{ role: "user", content: "x" }], ctrl.signal);
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("provider che non risponde → messaggio di timeout", async () => {
    mockFetch(
      (_url?: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason as Error),
          );
        }),
    );
    await expect(
      chat(cfg, [{ role: "user", content: "x" }], undefined, 10),
    ).rejects.toThrow(/in tempo/i);
  });

  it("propaga AbortError", async () => {
    mockFetch(() => Promise.reject(new DOMException("aborted", "AbortError")));
    await expect(chat(cfg, [{ role: "user", content: "x" }])).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
