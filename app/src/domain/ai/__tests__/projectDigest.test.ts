import { describe, it, expect } from "vitest";
import type { Entry, Project } from "@/data/types";
import { buildDigest, digestSignature } from "@/domain/ai/projectDigest";
import { aggregateByProject } from "@/domain/projectStats";
import { projectActivity } from "@/domain/projectActivity";

const wh = { morningStart: 9, morningEnd: 13, afternoonStart: 14, afternoonEnd: 18 };

const project: Project = {
  id: "p1",
  clientId: "c1",
  kind: "client",
  name: "Rifacimento sito",
  status: "active",
  description: "Nuovo sito vetrina",
  objectives: "Online entro l'estate",
  startDate: "2027-01-11",
  endDate: "",
  teamIds: [],
  contactIds: [],
  estimatedHours: 10,
  color: null,
};

const entry = (id: string, day: string, title: string, hours = 2): Entry => ({
  id,
  startsAt: `${day}T09:00`,
  endsAt: `${day}T${String(9 + hours).padStart(2, "0")}:00`,
  type: "client",
  projectId: "p1",
  clientId: "c1",
  subtypeId: "s1",
  title,
  collaboratorIds: [],
  contactIds: [],
  notes: "",
  blockers: "",
  nextSteps: "",
  links: [],
  milestone: null,
  createdAt: 0,
  updatedAt: 0,
});

const entries = [
  entry("e1", "2027-01-11", "Call con Mario sul wireframe"),
  entry("e2", "2027-02-03", "Revisione grafica con Anna Bianchi"),
];

const digest = (list: Entry[] = entries) =>
  buildDigest({
    project,
    stat: aggregateByProject(list, wh).get("p1"),
    activity: projectActivity(list, "p1", wh),
    entries: list,
    clientName: "Acme",
    today: "2027-03-15",
    subtypes: [{ id: "s1", label: "Design" }],
    people: [{ name: "Mario Rossi" }, { name: "Anna Bianchi" }],
    workHours: wh,
  });

describe("buildDigest", () => {
  it("porta anagrafica, totali e ripartizioni", () => {
    const d = digest();
    expect(d).toContain("Rifacimento sito");
    expect(d).toContain("Acme");
    expect(d).toContain("Nuovo sito vetrina");
    expect(d).toContain("4h");
    expect(d).toContain("Design");
  });

  it("non manda la serie di ore mese per mese", () => {
    expect(digest()).not.toContain("MESE");
  });

  it("dichiara la data di oggi, così 'fermo da un pezzo' è verificabile", () => {
    expect(digest()).toContain("OGGI: 2027-03-15");
  });

  it("non lascia uscire i nomi delle persone in anagrafica", () => {
    const d = digest();
    expect(d).not.toMatch(/Mario|Anna|Bianchi/);
    // Il resto del titolo resta: è il contenuto che rende utile il riassunto.
    expect(d).toContain("wireframe");
    expect(d).toContain("Revisione grafica");
  });

  it("regge un progetto senza attività", () => {
    const d = digest([]);
    expect(d).toContain("0 attività");
    expect(d).not.toContain("ATTIVITÀ (");
  });
});

describe("digestSignature", () => {
  it("cambia quando arriva un'attività", () => {
    const before = digestSignature(aggregateByProject(entries, wh).get("p1"));
    const after = digestSignature(
      aggregateByProject([...entries, entry("e3", "2027-03-01", "Consegna")], wh).get("p1"),
    );
    expect(after).not.toBe(before);
  });

  it("resta uguale a parità di dati", () => {
    expect(digestSignature(aggregateByProject(entries, wh).get("p1"))).toBe(
      digestSignature(aggregateByProject([...entries].reverse(), wh).get("p1")),
    );
  });
});
