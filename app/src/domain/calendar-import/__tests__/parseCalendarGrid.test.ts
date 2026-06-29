import { describe, expect, it } from "vitest";
import type { OcrWord } from "@/data/ocr/recognizeImage";
import { parseCalendarGrid } from "@/domain/calendar-import/parseCalendarGrid";

/** Parola centrata su (xc, yc), larga w e alta h. */
function word(text: string, xc: number, yc: number, w = 160, h = 16): OcrWord {
  return {
    text,
    confidence: 90,
    x0: xc - w / 2,
    x1: xc + w / 2,
    y0: yc - h / 2,
    y1: yc + h / 2,
  };
}
const line = word;

// Righello: ogni ora 100px, le 9:00 a y=100 → minutesAtY(y) = 0.6·y + 480.
function hour(h: number): OcrWord {
  return word(String(h), 20, 100 + (h - 9) * 100, 20, 16);
}

describe("parseCalendarGrid", () => {
  it("legge colonne, orari e durate dalla geometria", () => {
    const lines: OcrWord[] = [
      // righello ore 9..14
      hour(9), hour(10), hour(11), hour(12), hour(13), hour(14),
      // intestazioni giorni (sopra le 9:00)
      line("29", 120, 35, 40, 30),
      line("Lun", 120, 60, 40, 16),
      line("30", 400, 35, 40, 30),
      line("mar", 400, 60, 40, 16),
      // colonna lunedì
      line("AI ACT Alberico Aramini", 150, 200), // 10:00, una riga
      line("studia la copycobol", 150, 400), // 12:00, una riga
      // colonna martedì: blocco di tre righe a 10:00
      line("Fase 2", 410, 200),
      line("Riunione Microsoft Teams", 410, 222),
      line("Carlo Veronesi", 410, 244),
    ];

    const cols = parseCalendarGrid(lines, 30);
    expect(cols.map((c) => c.label)).toEqual(["29 Lun", "30 mar"]);

    const [lun, mar] = cols;
    expect(lun.events.map((e) => [e.startMin, e.durationMin])).toEqual([
      [600, 30], // 10:00, una riga → minimo uno slot
      [720, 30], // 12:00
    ]);
    expect(lun.events[0].title).toBe("AI ACT Alberico Aramini");

    expect(mar.events).toHaveLength(1);
    expect(mar.events[0].startMin).toBe(600);
    expect(mar.events[0].durationMin).toBe(60); // tre righe → blocco alto
    expect(mar.events[0].title).toBe("Fase 2 Riunione Microsoft Teams Carlo Veronesi");
  });

  it("ritorna [] senza un righello d'ore leggibile", () => {
    expect(parseCalendarGrid([line("solo testo", 100, 100)], 30)).toEqual([]);
  });
});
