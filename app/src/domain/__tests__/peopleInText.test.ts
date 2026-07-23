import { describe, it, expect } from "vitest";
import { namesInText } from "@/domain/peopleInText";

const team = [
  { id: "u1", name: "Mario Rossi" },
  { id: "u2", name: "Anna Bianchi" },
  { id: "u3", name: "Niccolò Verdi" },
];

describe("namesInText", () => {
  it("riconosce il nome proprio", () => {
    expect(namesInText("call con Mario sul sito", team)).toEqual(["u1"]);
  });

  it("riconosce il cognome", () => {
    expect(namesInText("riunione con Bianchi", team)).toEqual(["u2"]);
  });

  it("ignora accenti e maiuscole", () => {
    expect(namesInText("allineamento con NICCOLO", team)).toEqual(["u3"]);
    expect(namesInText("allineamento con niccolò", team)).toEqual(["u3"]);
  });

  it("riconosce più persone e mantiene l'ordine dei candidati", () => {
    expect(namesInText("call con Anna e Mario", team)).toEqual(["u1", "u2"]);
  });

  it("non aggancia parole che contengono il nome", () => {
    expect(namesInText("annali del progetto", team)).toEqual([]);
    expect(namesInText("marionetta", team)).toEqual([]);
  });

  it("davanti a un nome ambiguo non sceglie", () => {
    const due = [
      { id: "u1", name: "Mario Rossi" },
      { id: "u4", name: "Mario Bianchi" },
    ];
    expect(namesInText("call con Mario", due)).toEqual([]);
    // il cognome disambigua
    expect(namesInText("call con Mario Rossi", due)).toEqual(["u1"]);
  });

  it("nessun candidato, nessun risultato", () => {
    expect(namesInText("call con Mario", [])).toEqual([]);
  });
});
