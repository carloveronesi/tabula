// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { useAiChat } from "@/features/ai/useAiChat";
import { useSettingsStore } from "@/store/settings";
import { DEFAULT_SETTINGS } from "@/data/settings";

vi.mock("@/domain/ai/client", () => ({
  chat: vi.fn(),
}));
import { chat } from "@/domain/ai/client";

const mock = () => chat as unknown as ReturnType<typeof vi.fn>;

function enableAi() {
  useSettingsStore.setState({
    settings: {
      ...DEFAULT_SETTINGS,
      ai: { enabled: true, baseUrl: "https://x/v1", apiKey: "k", model: "m" },
    },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
});

describe("useAiChat", () => {
  it("accoda domanda e risposta, e somma i token dichiarati", async () => {
    enableAi();
    mock().mockResolvedValue({ text: "risposta", usage: { in: 100, out: 20 } });
    const { result } = renderHook(() => useAiChat(() => "contesto"));

    act(() => result.current.ask("quanto manca?"));
    await waitFor(() => expect(result.current.busy).toBe(false));

    expect(result.current.messages).toEqual([
      { role: "user", content: "quanto manca?" },
      { role: "assistant", content: "risposta" },
    ]);
    expect(result.current.tokens).toBe(120);
  });

  it("manda il contesto di adesso, non quello di quando è nata la chat", async () => {
    enableAi();
    mock().mockResolvedValue({ text: "ok", usage: null });
    let contesto = "primo";
    const { result } = renderHook(() => useAiChat(() => contesto));

    act(() => result.current.ask("uno"));
    await waitFor(() => expect(result.current.busy).toBe(false));
    contesto = "secondo";
    act(() => result.current.ask("due"));
    await waitFor(() => expect(result.current.busy).toBe(false));

    const [, messages] = mock().mock.calls[1];
    expect(messages[0]).toEqual({ role: "system", content: "secondo" });
    // Il turno precedente resta nel thread: la chat ha memoria.
    expect(messages).toHaveLength(4);
  });

  it("se la chiamata fallisce la domanda esce dal thread", async () => {
    enableAi();
    mock().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useAiChat(() => "c"));

    act(() => result.current.ask("domanda"));
    await waitFor(() => expect(result.current.error).toBe("boom"));
    expect(result.current.messages).toEqual([]);
  });

  it("ignora le domande vuote", () => {
    enableAi();
    const { result } = renderHook(() => useAiChat(() => "c"));
    act(() => result.current.ask("   "));
    expect(mock()).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });
});
