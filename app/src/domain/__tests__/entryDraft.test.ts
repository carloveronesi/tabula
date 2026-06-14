import { describe, it, expect } from "vitest";
import {
  emptyDraft,
  draftFromEntry,
  isDraftValid,
  applyDraft,
} from "@/domain/entryDraft";
import type { Entry } from "@/data/types";

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    startsAt: "2026-06-12T09:00:00",
    endsAt: "2026-06-12T10:30:00",
    type: "client",
    projectId: "p1",
    clientId: "c1",
    subtypeId: "s1",
    title: "Call",
    collaboratorIds: ["u1"],
    contactIds: ["k1"],
    notes: "note",
    blockers: "blk",
    nextSteps: "next",
    links: [{ label: "doc", url: "http://x" }],
    milestone: "M1",
    createdAt: 100,
    updatedAt: 200,
    ...over,
  };
}

describe("emptyDraft", () => {
  it("usa la data passata e default ragionevoli", () => {
    const d = emptyDraft("2026-06-12", 540, 570);
    expect(d).toMatchObject({
      title: "",
      date: "2026-06-12",
      startMin: 540,
      endMin: 570,
      type: "client",
      clientId: null,
      projectId: null,
      subtypeId: null,
      notes: "",
      blockers: "",
      nextSteps: "",
      links: [],
    });
  });
});

describe("draftFromEntry", () => {
  it("estrae data, minuti e campi modificabili", () => {
    const d = draftFromEntry(entry());
    expect(d).toEqual({
      title: "Call",
      date: "2026-06-12",
      startMin: 540,
      endMin: 630,
      type: "client",
      clientId: "c1",
      projectId: "p1",
      subtypeId: "s1",
      notes: "note",
      blockers: "blk",
      nextSteps: "next",
      links: [{ label: "doc", url: "http://x" }],
    });
  });

  it("copia l'array dei link (no aliasing con la entry di origine)", () => {
    const base = entry();
    const d = draftFromEntry(base);
    d.links.push({ label: "altro", url: "http://y" });
    expect(base.links).toHaveLength(1);
  });
});

describe("isDraftValid", () => {
  it("richiede titolo non vuoto e fine dopo inizio", () => {
    const base = emptyDraft("2026-06-12", 540, 600);
    expect(isDraftValid({ ...base, title: "X" })).toBe(true);
    expect(isDraftValid({ ...base, title: "  " })).toBe(false);
    expect(isDraftValid({ ...base, title: "X", endMin: 540 })).toBe(false);
    expect(isDraftValid({ ...base, title: "X", endMin: 500 })).toBe(false);
  });
});

describe("applyDraft", () => {
  it("nuova entry: id e createdAt dal contesto, range da data+minuti", () => {
    const d = emptyDraft("2026-06-12", 540, 600);
    const e = applyDraft(
      { ...d, title: "Nuovo", type: "internal", projectId: "p9", clientId: null },
      { id: "new1", now: 999 },
    );
    expect(e).toMatchObject({
      id: "new1",
      title: "Nuovo",
      type: "internal",
      projectId: "p9",
      clientId: null,
      startsAt: "2026-06-12T09:00:00",
      endsAt: "2026-06-12T10:00:00",
      createdAt: 999,
      updatedAt: 999,
    });
    // campi non gestiti dall'editor partono vuoti
    expect(e.collaboratorIds).toEqual([]);
    expect(e.links).toEqual([]);
    expect(e.blockers).toBe("");
  });

  it("modifica: conserva id/createdAt e i campi non editati, aggiorna updatedAt", () => {
    const base = entry();
    const d = draftFromEntry(base);
    const e = applyDraft(
      { ...d, title: "Rinominato" },
      { id: "ignored", now: 555, base },
    );
    expect(e.id).toBe("e1");
    expect(e.createdAt).toBe(100);
    expect(e.updatedAt).toBe(555);
    expect(e.title).toBe("Rinominato");
    // preservati dalla base (non modificati nella bozza)
    expect(e.blockers).toBe("blk");
    expect(e.nextSteps).toBe("next");
    expect(e.links).toEqual([{ label: "doc", url: "http://x" }]);
    expect(e.collaboratorIds).toEqual(["u1"]);
    expect(e.milestone).toBe("M1");
  });

  it("modifica: applica blockers/nextSteps/links editati nella bozza", () => {
    const base = entry();
    const d = draftFromEntry(base);
    const e = applyDraft(
      {
        ...d,
        blockers: "nuovo blocco",
        nextSteps: "nuovo passo",
        links: [{ label: "spec", url: "http://z" }],
      },
      { id: "ignored", now: 555, base },
    );
    expect(e.blockers).toBe("nuovo blocco");
    expect(e.nextSteps).toBe("nuovo passo");
    expect(e.links).toEqual([{ label: "spec", url: "http://z" }]);
    // campi anagrafici non gestiti dall'editor restano dalla base
    expect(e.collaboratorIds).toEqual(["u1"]);
    expect(e.milestone).toBe("M1");
  });
});
