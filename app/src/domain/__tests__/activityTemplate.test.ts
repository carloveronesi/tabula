import { describe, it, expect } from "vitest";
import { templateFromEntry, applyTemplate } from "@/domain/activityTemplate";
import { emptyDraft } from "@/domain/entryDraft";
import type { Entry } from "@/data/types";

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    startsAt: "2026-06-12T09:00:00",
    endsAt: "2026-06-12T10:00:00",
    type: "internal",
    projectId: "p1",
    clientId: "c1",
    subtypeId: "s1",
    title: "  Standup  ",
    collaboratorIds: ["x"],
    contactIds: ["y"],
    notes: "nota",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

describe("templateFromEntry", () => {
  it("conserva la classificazione e usa il titolo (trimmato) come nome", () => {
    const t = templateFromEntry(entry(), "t1", 99);
    expect(t).toEqual({
      id: "t1",
      name: "Standup",
      title: "Standup",
      type: "internal",
      clientId: "c1",
      projectId: "p1",
      subtypeId: "s1",
      createdAt: 99,
    });
  });

  it("ripiega su un nome quando il titolo è vuoto", () => {
    expect(templateFromEntry(entry({ title: "  " }), "t1", 0).name).toBe(
      "Senza titolo",
    );
  });
});

describe("applyTemplate", () => {
  it("imposta classificazione ma lascia giorno e fascia della bozza", () => {
    const draft = emptyDraft("2026-07-01", 600, 660);
    const t = templateFromEntry(entry(), "t1", 0);
    const out = applyTemplate(draft, t);
    expect(out).toMatchObject({
      date: "2026-07-01",
      startMin: 600,
      endMin: 660,
      title: "Standup",
      type: "internal",
      clientId: "c1",
      projectId: "p1",
      subtypeId: "s1",
    });
  });
});
