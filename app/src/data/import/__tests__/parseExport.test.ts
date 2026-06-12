import { describe, it, expect } from "vitest";
import { parseExport } from "@/data/import/parseExport";

/** Helper: serializza i valori come fa l'export (valori = stringhe JSON). */
function stringifyValues(obj: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]),
  );
}

describe("parseExport", () => {
  it("export vuoto → struttura con default", () => {
    expect(parseExport({})).toEqual({
      months: {},
      settings: null,
      projects: null,
      clients: null,
      people: [],
      todos: [],
    });
  });

  it("separa le chiavi-mese e ne estrae byDate", () => {
    const raw = stringifyValues({
      "dailylog:v1:2026-06": {
        byDate: { "2026-06-01": { AM: null, PM: null, location: "office" } },
      },
      "dailylog:v1:2026-09": { byDate: {} },
    });

    const out = parseExport(raw);

    expect(Object.keys(out.months)).toEqual(["2026-06", "2026-09"]);
    expect(out.months["2026-06"]["2026-06-01"].location).toBe("office");
    expect(out.months["2026-09"]).toEqual({});
  });

  it("estrae e fa il parse delle sezioni meta", () => {
    const raw = stringifyValues({
      "dailylog:v1:__settings": { theme: "light", slotMinutes: 30 },
      "dailylog:v1:__projects": { prj_a: { id: "prj_a", name: "X", kind: "internal", clientKey: null } },
      "dailylog:v1:__clients": { acme: { name: "ACME" } },
      "dailylog:v1:__people": [{ name: "Tizio" }],
      dailylog_todos: [{ id: "t1", title: "Todo", isDone: false, createdAt: 1 }],
    });

    const out = parseExport(raw);

    expect(out.settings).toMatchObject({ theme: "light" });
    expect(out.projects?.prj_a.name).toBe("X");
    expect(out.clients?.acme.name).toBe("ACME");
    expect(out.people).toHaveLength(1);
    expect(out.todos[0].title).toBe("Todo");
  });

  it("ignora chiavi sconosciute e sezioni interne", () => {
    const raw = stringifyValues({
      "dailylog:v1:__migrations": { version: 2 },
      "qualcosa:altro": { x: 1 },
    });
    const out = parseExport(raw);
    expect(out.months).toEqual({});
    expect(out.settings).toBeNull();
  });

  it("tollera valori JSON malformati (li salta)", () => {
    const out = parseExport({
      "dailylog:v1:__settings": "{non-json",
      "dailylog:v1:2026-06": "{ancora rotto",
    });
    expect(out.settings).toBeNull();
    expect(out.months).toEqual({});
  });

  it("accetta valori già come oggetto (non stringa)", () => {
    const out = parseExport({
      "dailylog:v1:__clients": { acme: { name: "ACME" } },
    });
    expect(out.clients?.acme.name).toBe("ACME");
  });
});
