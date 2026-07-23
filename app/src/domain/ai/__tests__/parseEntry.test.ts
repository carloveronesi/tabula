import { describe, it, expect } from "vitest";
import { coerceHints, type ParseInventory } from "@/domain/ai/parseEntry";

const inv: ParseInventory = {
  clients: [{ id: "c1", name: "Acme" }],
  projects: [
    { id: "p1", name: "Rifacimento sito", clientId: "c1" },
    { id: "p2", name: "Formazione", clientId: null },
  ],
  subtypes: [{ id: "s1", label: "Call" }],
};

const fallback = "testo originale";

describe("coerceHints", () => {
  it("accetta una risposta ben formata", () => {
    expect(
      coerceHints(
        {
          title: "Call sul rifacimento sito",
          dayOffset: -1,
          start: "15:00",
          durationMin: 120,
          kind: "client",
          clientId: "c1",
          projectId: "p1",
          subtypeId: "s1",
        },
        inv,
        fallback,
      ),
    ).toEqual({
      title: "Call sul rifacimento sito",
      dayOffset: -1,
      startMin: 900,
      durationMin: 120,
      kind: "client",
      clientId: "c1",
      projectId: "p1",
      subtypeId: "s1",
    });
  });

  it("scarta gli id inventati invece di crearli", () => {
    const h = coerceHints(
      { title: "x", clientId: "c-inesistente", projectId: "p-inesistente", subtypeId: "s9" },
      inv,
      fallback,
    );
    expect(h.clientId).toBeNull();
    expect(h.projectId).toBeNull();
    expect(h.subtypeId).toBeNull();
  });

  it("deduce cliente e modalità dal progetto", () => {
    expect(coerceHints({ title: "x", projectId: "p1" }, inv, fallback)).toMatchObject({
      kind: "client",
      clientId: "c1",
      projectId: "p1",
    });
    expect(coerceHints({ title: "x", projectId: "p2" }, inv, fallback)).toMatchObject({
      kind: "internal",
      clientId: null,
      projectId: "p2",
    });
  });

  // Il progetto è il segnale più specifico: se contraddice kind o clientId,
  // vince lui. Così la coppia cliente/progetto resta sempre coerente — è
  // l'invariante su cui il combobox del popover filtra i progetti.
  it("il progetto vince sul cliente e sulla modalità dichiarati", () => {
    expect(
      coerceHints({ title: "x", kind: "internal", projectId: "p1" }, inv, fallback),
    ).toMatchObject({ kind: "client", clientId: "c1", projectId: "p1" });

    expect(
      coerceHints({ title: "x", clientId: "c1", projectId: "p2" }, inv, fallback),
    ).toMatchObject({ kind: "internal", clientId: null, projectId: "p2" });
  });

  it("senza progetto valido tiene il cliente dichiarato", () => {
    const h = coerceHints({ title: "x", clientId: "c1", projectId: "boh" }, inv, fallback);
    expect(h).toMatchObject({ kind: "client", clientId: "c1", projectId: null });
  });

  it("ripiega sul testo originale se il titolo manca", () => {
    expect(coerceHints({ dayOffset: 0 }, inv, fallback).title).toBe(fallback);
    expect(coerceHints({ title: "   " }, inv, fallback).title).toBe(fallback);
  });

  it("normalizza orari e durate fuori scala", () => {
    expect(coerceHints({ start: "9" }, inv, fallback).startMin).toBe(540);
    expect(coerceHints({ start: "25:00" }, inv, fallback).startMin).toBeNull();
    expect(coerceHints({ start: "12:75" }, inv, fallback).startMin).toBeNull();
    expect(coerceHints({ durationMin: 0 }, inv, fallback).durationMin).toBeNull();
    expect(coerceHints({ durationMin: 5000 }, inv, fallback).durationMin).toBeNull();
    expect(coerceHints({ durationMin: 90.4 }, inv, fallback).durationMin).toBe(90);
  });

  it("ignora uno scarto di giorni assurdo", () => {
    expect(coerceHints({ dayOffset: -3 }, inv, fallback).dayOffset).toBe(-3);
    expect(coerceHints({ dayOffset: -900 }, inv, fallback).dayOffset).toBe(0);
    expect(coerceHints({ dayOffset: "ieri" }, inv, fallback).dayOffset).toBe(0);
  });

  it("sopravvive a una risposta che non è un oggetto", () => {
    expect(coerceHints(null, inv, fallback)).toEqual({
      title: fallback,
      dayOffset: 0,
      startMin: null,
      durationMin: null,
      kind: "client",
      clientId: null,
      projectId: null,
      subtypeId: null,
    });
  });
});
