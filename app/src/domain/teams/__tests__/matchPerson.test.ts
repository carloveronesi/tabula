import { describe, it, expect } from "vitest";
import type { Contact, Person } from "@/data/types";
import {
  matchPerson,
  nameSimilarity,
  MATCH_THRESHOLD,
} from "@/domain/teams/matchPerson";

const people: Person[] = [
  { id: "p1", name: "Martina Pastore" },
  { id: "p2", name: "Andrea Arriviello" },
  { id: "p3", name: "Christian Rossi" },
];

const contacts: Contact[] = [
  { id: "c1", clientId: "cl1", name: "Alberico Aramini", role: "PM" },
];

describe("nameSimilarity", () => {
  it("1 per uguaglianza esatta, insensibile a maiuscole e accenti", () => {
    expect(nameSimilarity("Martina Pastore", "martina pastore")).toBe(1);
    expect(nameSimilarity("Niccolò", "niccolo")).toBe(1);
  });

  it("robusta all'ordine dei token", () => {
    expect(nameSimilarity("Rossi Christian", "Christian Rossi")).toBe(1);
  });

  it("alta su refusi minori dell'OCR", () => {
    expect(nameSimilarity("Martlna Pastore", "Martina Pastore")).toBeGreaterThan(
      MATCH_THRESHOLD,
    );
  });

  it("bassa tra nomi diversi", () => {
    expect(nameSimilarity("Mario Bianchi", "Christian Rossi")).toBeLessThan(
      MATCH_THRESHOLD,
    );
  });
});

describe("matchPerson", () => {
  it("collega alla persona del team", () => {
    const m = matchPerson("Martina Pastore", people, contacts);
    expect(m).toMatchObject({ id: "p1", kind: "person", confidence: 1 });
  });

  it("ricade sui contatti quando serve", () => {
    const m = matchPerson("Alberico Aramini", people, contacts);
    expect(m).toMatchObject({ id: "c1", kind: "contact" });
  });

  it("tollera un refuso e collega comunque", () => {
    const m = matchPerson("Andrea Arrivlello", people, contacts);
    expect(m?.id).toBe("p2");
  });

  it("ritorna null sotto la soglia", () => {
    expect(matchPerson("Tizio Sconosciuto", people, contacts)).toBeNull();
  });

  it("la persona vince sul contatto a parità di nome", () => {
    const dup: Contact[] = [
      { id: "cX", clientId: "cl1", name: "Martina Pastore", role: "" },
    ];
    const m = matchPerson("Martina Pastore", people, dup);
    expect(m?.kind).toBe("person");
  });
});
