import { describe, it, expect } from "vitest";
import { parseDuration, parseTeamsHistory } from "@/domain/teams/parseHistory";

describe("parseDuration", () => {
  it("compone ore, minuti e secondi", () => {
    expect(parseDuration("2h 2m")).toBe(122);
    expect(parseDuration("1h 30m")).toBe(90);
    expect(parseDuration("1h")).toBe(60);
    expect(parseDuration("28m 25s")).toBe(28);
    expect(parseDuration("6m 55s")).toBe(7); // arrotondato
  });

  it("non scende mai sotto 1 minuto", () => {
    expect(parseDuration("11s")).toBe(1);
    expect(parseDuration("0m 5s")).toBe(1);
  });

  it("ignora righe che non sono durate", () => {
    expect(parseDuration("Martina Pastore")).toBeNull();
    expect(parseDuration("In uscita")).toBeNull();
    expect(parseDuration("Ieri")).toBeNull();
    expect(parseDuration("")).toBeNull();
  });

  it("non scambia un nome con cifre per una durata", () => {
    expect(parseDuration("Studio 3")).toBeNull();
  });
});

describe("parseTeamsHistory", () => {
  it("estrae le chiamate dallo screenshot di esempio", () => {
    // Ordine tipico dell'OCR: iniziali avatar, nome, direzione, giorno, durata.
    const text = `
      MP
      Martina Pastore
      In uscita
      Ieri
      6m 55s
      AA
      Andrea Arriviello
      In arrivo
      Ieri
      11m 55s
      AA
      Alberico Aramini
      In arrivo
      domenica
      2h 2m
    `;
    expect(parseTeamsHistory(text)).toEqual([
      { name: "Martina Pastore", direction: "out", dayLabel: "Ieri", durationMin: 7 },
      { name: "Andrea Arriviello", direction: "in", dayLabel: "Ieri", durationMin: 12 },
      { name: "Alberico Aramini", direction: "in", dayLabel: "domenica", durationMin: 122 },
    ]);
  });

  it("scarta le chiamate senza durata leggibile", () => {
    const text = `Mario Rossi\nIn arrivo\nIeri\nGiulia Bianchi\nIn uscita\nsabato\n28m 25s`;
    const calls = parseTeamsHistory(text);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ name: "Giulia Bianchi", durationMin: 28 });
  });

  it("tollera direzione e giorno mancanti", () => {
    const calls = parseTeamsHistory(`Luca Verdi\n45m`);
    expect(calls).toEqual([
      { name: "Luca Verdi", direction: null, dayLabel: null, durationMin: 45 },
    ]);
  });

  it("ignora le iniziali avatar come righe-nome", () => {
    const calls = parseTeamsHistory(`CR\nChristian Rossi\nIn uscita\nvenerdì\n11m 55s`);
    expect(calls).toEqual([
      { name: "Christian Rossi", direction: "out", dayLabel: "venerdì", durationMin: 12 },
    ]);
  });

  it("riconosce le date numeriche come giorno", () => {
    const calls = parseTeamsHistory(`Anna Neri\nIn arrivo\n12/06\n30m`);
    expect(calls[0].dayLabel).toBe("12/06");
  });

  it("estrae le chiamate dal layout OCR reale (due righe, più campi, rumore)", () => {
    // Testo grezzo come prodotto da Tesseract sullo screenshot reale.
    const text = `*_ Cronologia Tutti =
@ Martina Pastore leri
W' In uscita 6m 55s
è Andrea Arriviello leri
© W In arrivo 11m 55s
me] Martina Pastore leri
In uscita 9m 23s
aa Alberico Aramini domenica
W In arrivo 2h 2m
è Christian Rossi sabato
W In arrivo 28m 25s
aa] Alberico Aramini sabato
W In arrivo 1h 30m
aa) Alberico Aramini venerdì
In arrivo 1h
cr] Christian Rossi venerdì
W' In uscita 11m 55s`;
    const calls = parseTeamsHistory(text);
    expect(calls).toEqual([
      { name: "Martina Pastore", direction: "out", dayLabel: "leri", durationMin: 7 },
      { name: "Andrea Arriviello", direction: "in", dayLabel: "leri", durationMin: 12 },
      { name: "Martina Pastore", direction: "out", dayLabel: "leri", durationMin: 9 },
      { name: "Alberico Aramini", direction: "in", dayLabel: "domenica", durationMin: 122 },
      { name: "Christian Rossi", direction: "in", dayLabel: "sabato", durationMin: 28 },
      { name: "Alberico Aramini", direction: "in", dayLabel: "sabato", durationMin: 90 },
      { name: "Alberico Aramini", direction: "in", dayLabel: "venerdì", durationMin: 60 },
      { name: "Christian Rossi", direction: "out", dayLabel: "venerdì", durationMin: 12 },
    ]);
  });
});
