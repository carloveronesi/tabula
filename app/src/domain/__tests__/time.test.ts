import { describe, it, expect } from "vitest";
import { dateTimeAt, durationMinutes, overlaps } from "@/domain/time";

describe("dateTimeAt", () => {
  it("compone una ISODateTime locale", () => {
    expect(dateTimeAt("2026-06-12", 540)).toBe("2026-06-12T09:00:00");
  });

  it("rappresenta la fine giornata come 24:00:00", () => {
    expect(dateTimeAt("2026-06-12", 1440)).toBe("2026-06-12T24:00:00");
  });

  it("vincola i minuti fuori scala a [0, 1440] (niente ore ≥ 25)", () => {
    expect(dateTimeAt("2026-06-12", 1530)).toBe("2026-06-12T24:00:00");
    expect(dateTimeAt("2026-06-12", -30)).toBe("2026-06-12T00:00:00");
  });
});

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
