// @vitest-environment jsdom
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
