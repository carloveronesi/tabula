import { describe, it, expect } from "vitest";
import { durationMinutes, overlaps } from "@/domain/time";

describe("overlaps", () => {
  it("true quando i range si sovrappongono", () => {
    expect(
      overlaps(
        { startsAt: "2026-06-12T09:00", endsAt: "2026-06-12T11:00" },
        { startsAt: "2026-06-12T10:00", endsAt: "2026-06-12T12:00" },
      ),
    ).toBe(true);
  });

  it("false quando sono solo adiacenti", () => {
    expect(
      overlaps(
        { startsAt: "2026-06-12T09:00", endsAt: "2026-06-12T10:00" },
        { startsAt: "2026-06-12T10:00", endsAt: "2026-06-12T11:00" },
      ),
    ).toBe(false);
  });
});

describe("durationMinutes", () => {
  it("calcola la durata in minuti", () => {
    expect(
      durationMinutes({
        startsAt: "2026-06-12T09:00:00",
        endsAt: "2026-06-12T10:30:00",
      }),
    ).toBe(90);
  });
});
