import { describe, it, expect } from "vitest";
import type { CallProposal } from "@/domain/teams/placeCalls";
import { callNote, proposalToDraft } from "@/domain/teams/proposalDraft";

function proposal(over: Partial<CallProposal> = {}): CallProposal {
  return {
    call: { name: "Martina Pastore", direction: "out", dayLabel: "Ieri", durationMin: 30 },
    date: "2026-06-22",
    startMin: 540,
    endMin: 570,
    match: null,
    ...over,
  };
}

describe("callNote", () => {
  it("marca direzione quando nota", () => {
    expect(callNote("out")).toBe("Chiamata Teams · in uscita");
    expect(callNote("in")).toBe("Chiamata Teams · in arrivo");
    expect(callNote(null)).toBe("Chiamata Teams");
  });
});

describe("proposalToDraft", () => {
  it("mappa i campi base in un evento", () => {
    const d = proposalToDraft(proposal());
    expect(d).toMatchObject({
      title: "Martina Pastore",
      date: "2026-06-22",
      startMin: 540,
      endMin: 570,
      type: "event",
      notes: "Chiamata Teams · in uscita",
      collaboratorIds: [],
      contactIds: [],
    });
  });

  it("una persona collegata va tra i collaboratori", () => {
    const d = proposalToDraft(
      proposal({ match: { id: "p1", kind: "person", name: "Martina Pastore", confidence: 1 } }),
    );
    expect(d.collaboratorIds).toEqual(["p1"]);
    expect(d.contactIds).toEqual([]);
  });

  it("un contatto collegato va tra i contatti", () => {
    const d = proposalToDraft(
      proposal({ match: { id: "c1", kind: "contact", name: "Alberico Aramini", confidence: 0.9 } }),
    );
    expect(d.contactIds).toEqual(["c1"]);
    expect(d.collaboratorIds).toEqual([]);
  });
});
