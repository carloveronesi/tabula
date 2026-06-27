// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInstallPrompt } from "@/pwa/useInstallPrompt";

/** Finto evento beforeinstallprompt con prompt() spiabile. */
function installEvent() {
  const e = new Event("beforeinstallprompt") as Event & {
    prompt: () => Promise<unknown>;
  };
  e.prompt = vi.fn(() => Promise.resolve());
  return e;
}

describe("useInstallPrompt", () => {
  it("di default non si può installare", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
  });

  it("beforeinstallprompt abilita l'installazione", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(installEvent());
    });
    expect(result.current.canInstall).toBe(true);
  });

  it("install() chiama prompt() dell'evento e disabilita di nuovo", () => {
    const { result } = renderHook(() => useInstallPrompt());
    const ev = installEvent();
    act(() => {
      window.dispatchEvent(ev);
    });

    act(() => {
      result.current.install();
    });

    expect(ev.prompt).toHaveBeenCalledOnce();
    expect(result.current.canInstall).toBe(false);
  });

  it("appinstalled nasconde l'invito", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(installEvent());
    });
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(result.current.canInstall).toBe(false);
  });
});
