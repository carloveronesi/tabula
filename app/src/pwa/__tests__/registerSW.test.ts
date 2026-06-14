import { describe, it, expect, vi } from "vitest";
import { registerServiceWorker } from "@/pwa/registerSW";

describe("registerServiceWorker", () => {
  it("registra il service worker quando supportato", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const ok = registerServiceWorker("/sw.js", {
      serviceWorker: { register },
    });
    expect(ok).toBe(true);
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("non fa nulla se il service worker non è supportato", () => {
    const ok = registerServiceWorker("/sw.js", {});
    expect(ok).toBe(false);
  });
});
