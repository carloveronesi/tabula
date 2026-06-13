import { describe, it, expect } from "vitest";
import { resolveTheme } from "@/domain/theme";

describe("resolveTheme", () => {
  it("light/dark espliciti ignorano il sistema", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("system segue la preferenza del sistema", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
