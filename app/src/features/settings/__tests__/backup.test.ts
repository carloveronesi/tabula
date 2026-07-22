import { describe, it, expect } from "vitest";
import { isBackupOverdue } from "@/features/settings/backup";

const DAY = 24 * 60 * 60 * 1000;
const now = 100 * DAY;

describe("isBackupOverdue", () => {
  it("scaduto se non c'è mai stato un backup", () => {
    expect(isBackupOverdue(undefined, now)).toBe(true);
  });

  it("scaduto oltre i 14 giorni", () => {
    expect(isBackupOverdue(now - 15 * DAY, now)).toBe(true);
  });

  it("non scaduto entro i 14 giorni", () => {
    expect(isBackupOverdue(now - 13 * DAY, now)).toBe(false);
  });
});
