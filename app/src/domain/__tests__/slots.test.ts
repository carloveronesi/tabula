import { describe, it, expect } from "vitest";
import {
  buildSlots,
  dayPresets,
  entryRowSpan,
  fasciaEndLabel,
  lunchBoundary,
  minutesOfDay,
  minutesToLabel,
  type WorkHours,
} from "@/domain/slots";

const WH: WorkHours = {
  morningStart: 540, // 09:00
  morningEnd: 780, // 13:00
  afternoonStart: 840, // 14:00
  afternoonEnd: 1080, // 18:00
};

describe("dayPresets", () => {
  it("giornata intera, mattina e pomeriggio dalla giornata lavorativa", () => {
    expect(dayPresets(WH)).toEqual([
      { id: "full", label: "Giornata", startMin: 540, endMin: 1080 },
      { id: "morning", label: "Mattina", startMin: 540, endMin: 780 },
      { id: "afternoon", label: "Pomeriggio", startMin: 840, endMin: 1080 },
    ]);
  });
});

describe("buildSlots", () => {
  it("slot da 30 min: 8 al mattino, 8 al pomeriggio, 16 totali", () => {
    const s = buildSlots(WH, 30);
    expect(s.morning).toHaveLength(8);
    expect(s.afternoon).toHaveLength(8);
    expect(s.all).toHaveLength(16);
    expect(s.morning[0]).toBe(540);
    expect(s.morning.at(-1)).toBe(750); // ultimo slot 12:30–13:00
    expect(s.afternoon[0]).toBe(840);
    expect(s.afternoon.at(-1)).toBe(1050); // 17:30–18:00
  });

  it("slot da 15 min: 16 al mattino", () => {
    const s = buildSlots(WH, 15);
    expect(s.morning).toHaveLength(16);
    expect(s.morning[1]).toBe(555); // 09:15
  });

  it("non genera slot che sforano la fine della fascia", () => {
    const s = buildSlots({ ...WH, morningEnd: 770 }, 30);
    expect(s.morning.at(-1)).toBe(720); // 720+30=750<=770; 750+30=780>770 escluso
  });
});

describe("lunchBoundary", () => {
  it("confine = n° slot mattutini (dove inizia il pomeriggio)", () => {
    expect(lunchBoundary(WH, 30)).toBe(8); // 8 slot mattino
    expect(lunchBoundary(WH, 15)).toBe(16);
  });

  it("nessuna pausa se il pomeriggio è attaccato al mattino", () => {
    expect(lunchBoundary({ ...WH, afternoonStart: 780 }, 30)).toBeNull();
  });

  it("nessuna pausa se una fascia è vuota", () => {
    // mattino vuoto: morningStart === morningEnd
    expect(lunchBoundary({ ...WH, morningStart: 780 }, 30)).toBeNull();
  });
});

describe("fasciaEndLabel", () => {
  // 30 min: 16 slot, confine 8, ultimo indice 15. slots[7]=750 (12:30), slots[15]=1050.
  it("ultima riga del mattino → fine mattino (13:00)", () => {
    expect(fasciaEndLabel(7, 750, 8, 15, WH)).toBe(780);
  });
  it("ultima riga del giorno → fine pomeriggio (18:00)", () => {
    expect(fasciaEndLabel(15, 1050, 8, 15, WH)).toBe(1080);
  });
  it("righe intermedie → nessuna etichetta", () => {
    expect(fasciaEndLabel(3, 630, 8, 15, WH)).toBeNull();
  });
  it("senza pausa: solo la fine giornata, non quella del mattino", () => {
    const cont = { ...WH, afternoonStart: 780 }; // pomeriggio attaccato
    const slots = buildSlots(cont, 30).all;
    const last = slots.length - 1;
    expect(fasciaEndLabel(7, slots[7], null, last, cont)).toBeNull();
    expect(fasciaEndLabel(last, slots[last], null, last, cont)).toBe(1080);
  });
});

describe("minutesToLabel", () => {
  it("formatta i minuti in HH:MM", () => {
    expect(minutesToLabel(540)).toBe("09:00");
    expect(minutesToLabel(1050)).toBe("17:30");
    expect(minutesToLabel(0)).toBe("00:00");
  });
});

describe("minutesOfDay", () => {
  it("estrae i minuti dall'orario ISO", () => {
    expect(minutesOfDay("2026-06-10T09:30:00")).toBe(570);
    expect(minutesOfDay("2026-06-10T00:00:00")).toBe(0);
    expect(minutesOfDay("2026-06-10T17:30:00")).toBe(1050);
  });
});

describe("entryRowSpan", () => {
  const slots = buildSlots(WH, 30).all; // 16 slot

  it("blocco 09:00–10:00 → riga 0, span 2", () => {
    expect(entryRowSpan(540, 600, slots)).toEqual({ startRow: 0, span: 2 });
  });

  it("giornata intera 09:00–18:00 → riga 0, span 16", () => {
    expect(entryRowSpan(540, 1080, slots)).toEqual({ startRow: 0, span: 16 });
  });

  it("pomeriggio 14:00–15:00 → riga 8, span 2", () => {
    expect(entryRowSpan(840, 900, slots)).toEqual({ startRow: 8, span: 2 });
  });

  it("inizio fuori dalle fasce lavorative → null", () => {
    expect(entryRowSpan(420, 480, slots)).toBeNull(); // 07:00
  });
});
