import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
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
  cleanup();
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
    (chat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ text: "riscritto", usage: null });
    const onApply = vi.fn();
    render(<AiField value="originale" systemPrompt="sys" onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: /migliora/i }));
    await waitFor(() => screen.getByText("riscritto"));
    fireEvent.click(screen.getByRole("button", { name: /applica/i }));
    expect(onApply).toHaveBeenCalledWith("riscritto");
  });
});
