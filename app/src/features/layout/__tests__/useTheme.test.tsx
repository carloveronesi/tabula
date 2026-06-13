import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { useSettingsStore } from "@/store/settings";
import { useTheme } from "@/features/layout/useTheme";

function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
  mockMatchMedia(false);
});

describe("useTheme", () => {
  it("tema 'dark' aggiunge la classe .dark a <html>", () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, theme: "dark" },
    });
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("tema 'light' rimuove la classe .dark", () => {
    document.documentElement.classList.add("dark");
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, theme: "light" },
    });
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("tema 'system' segue prefers-color-scheme", () => {
    mockMatchMedia(true);
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, theme: "system" },
    });
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("reagisce al cambio di impostazione", () => {
    const { rerender } = renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() =>
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, theme: "dark" },
      }),
    );
    rerender();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
