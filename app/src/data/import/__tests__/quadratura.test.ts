import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { importFromExport, slotConfigFromSettings } from "@/data/import/importer";
import { parseExport } from "@/data/import/parseExport";
import { dayToRanges } from "@/data/import/dayToRanges";

/**
 * Quadratura su un file di import REALE (gitignored, solo locale).
 * Quando il file non esiste → la suite viene saltata.
 */
const here = fileURLToPath(new URL(".", import.meta.url));
const REAL = resolve(here, "../../../../test/local/tabula_import_sample.json");
const present = existsSync(REAL);

(present ? describe : describe.skip)("quadratura import", () => {
  const raw = present
    ? (JSON.parse(readFileSync(REAL, "utf8")) as Record<string, unknown>)
    : {};
  const parsed = parseExport(raw);
  const result = importFromExport(raw);

  it("conserva il numero di clienti/progetti/persone", () => {
    expect(result.clients.length).toBe(Object.keys(parsed.clients ?? {}).length);
    expect(result.projects.length).toBe(Object.keys(parsed.projects ?? {}).length);
    expect(result.people.length).toBe(parsed.people.length);
  });

  it("produce una entry per ogni range logico di ogni giorno", () => {
    const config = slotConfigFromSettings(parsed.settings);
    let expected = 0;
    for (const byDate of Object.values(parsed.months)) {
      for (const [date, day] of Object.entries(byDate)) {
        expected += dayToRanges(date, day, config).length;
      }
    }
    expect(result.entries.length).toBe(expected);
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it("ogni entry ha un range temporale valido (start < end)", () => {
    for (const e of result.entries) {
      expect(e.startsAt < e.endsAt).toBe(true);
    }
  });

  it("ogni entry con projectId punta a un progetto esistente", () => {
    const ids = new Set(result.projects.map((p) => p.id));
    for (const e of result.entries) {
      if (e.projectId) expect(ids.has(e.projectId)).toBe(true);
    }
  });
});
