import { describe, it, expect } from "vitest";
import { eventToDraft } from "../eventDraft";

const base = {
  title: "AI ACT",
  date: "2026-06-29" as const,
  startMin: 600,
  durationMin: 30,
  match: null,
};

describe("eventToDraft — categoria dal progetto", () => {
  it("senza progetto resta un event generico", () => {
    const d = eventToDraft({ ...base, project: null });
    expect(d.type).toBe("event");
    expect(d.clientId).toBeNull();
    expect(d.projectId).toBeNull();
  });

  it("progetto cliente → eredita tipo e cliente", () => {
    const d = eventToDraft({
      ...base,
      project: { id: "p1", kind: "client", clientId: "c1" },
    });
    expect(d.type).toBe("client");
    expect(d.clientId).toBe("c1");
    expect(d.projectId).toBe("p1");
  });

  it("progetto interno → tipo interno, nessun cliente", () => {
    const d = eventToDraft({
      ...base,
      project: { id: "p2", kind: "internal", clientId: null },
    });
    expect(d.type).toBe("internal");
    expect(d.clientId).toBeNull();
    expect(d.projectId).toBe("p2");
  });
});
