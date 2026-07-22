import "fake-indexeddb/auto";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AiSettings } from "@/features/settings/sections/AiSettings";
import { useSettingsStore } from "@/store/settings";
import { DEFAULT_SETTINGS } from "@/data/settings";

afterEach(() => {
  cleanup();
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
});

describe("AiSettings", () => {
  it("attivare l'AI salva enabled=true nello store", async () => {
    render(<AiSettings />);
    fireEvent.click(screen.getByRole("button", { name: /^attiva$/i }));
    await waitFor(() =>
      expect(useSettingsStore.getState().settings.ai.enabled).toBe(true),
    );
  });

  it("scrivere la base URL la salva nello store", async () => {
    render(<AiSettings />);
    const input = screen.getByLabelText(/base url/i);
    fireEvent.change(input, { target: { value: "https://api.openai.com/v1" } });
    await waitFor(() =>
      expect(useSettingsStore.getState().settings.ai.baseUrl).toBe(
        "https://api.openai.com/v1",
      ),
    );
  });
});
