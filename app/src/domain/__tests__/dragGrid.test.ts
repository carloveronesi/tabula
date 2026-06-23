import { describe, it, expect } from "vitest";
import {
  rowAtOffset,
  rowTop,
  LUNCH_BAND,
  clampCreateToSide,
  columnAtOffset,
  deltaRows,
  createRange,
  moveBlock,
  resizeTop,
  resizeBottom,
  rowsToRange,
} from "@/domain/dragGrid";
import { buildSlots, type WorkHours } from "@/domain/slots";

const WH: WorkHours = {
  morningStart: 540,
  morningEnd: 780,
  afternoonStart: 840,
  afternoonEnd: 1080,
};
const SLOTS = buildSlots(WH, 30).all; // 16 slot: 8 mattina + 8 pomeriggio

describe("rowAtOffset", () => {
  it("mappa l'offset Y alla riga, con clamp ai bordi", () => {
    expect(rowAtOffset(0, 44, 16)).toBe(0);
    expect(rowAtOffset(50, 44, 16)).toBe(1);
    expect(rowAtOffset(-10, 44, 16)).toBe(0); // sopra → 0
    expect(rowAtOffset(9999, 44, 16)).toBe(15); // sotto → ultima
  });
});

describe("pausa pranzo (boundary = 8, banda fissa)", () => {
  // SLOTS: 16 righe, confine pausa alla riga 8 (inizio pomeriggio). slotHeight 44.
  const B = 8;

  describe("rowTop", () => {
    it("mattino senza offset, pomeriggio spostato della banda", () => {
      expect(rowTop(0, 44, B)).toBe(0);
      expect(rowTop(7, 44, B)).toBe(308); // ultima riga mattino
      expect(rowTop(8, 44, B)).toBe(8 * 44 + LUNCH_BAND); // prima riga pomeriggio
      expect(rowTop(8, 44, null)).toBe(352); // senza pausa: nessuno spostamento
    });
  });

  describe("rowAtOffset", () => {
    it("dentro la banda → primo slot del pomeriggio", () => {
      expect(rowAtOffset(360, 44, 16, B)).toBe(8); // 352..374 è la banda
    });
    it("oltre la banda → riga pomeriggio corretta", () => {
      const split = B * 44; // fondo del mattino in px
      expect(rowAtOffset(split + LUNCH_BAND + 22, 44, 16, B)).toBe(8); // metà riga 8
      expect(rowAtOffset(split + LUNCH_BAND + 44 + 22, 44, 16, B)).toBe(9); // metà riga 9
    });
    it("mattino invariato", () => {
      expect(rowAtOffset(50, 44, 16, B)).toBe(1);
    });
  });

  describe("clampCreateToSide", () => {
    it("ancora nel mattino: l'intervallo si ferma a fine mattino", () => {
      const r = createRange(6, 10); // { startRow: 6, span: 5 }
      expect(clampCreateToSide(r.startRow, r.span, 6, B)).toEqual({ startRow: 6, span: 2 });
    });
    it("ancora nel pomeriggio: l'intervallo parte dall'inizio pomeriggio", () => {
      const r = createRange(10, 6); // { startRow: 6, span: 5 }
      expect(clampCreateToSide(r.startRow, r.span, 10, B)).toEqual({ startRow: 8, span: 3 });
    });
    it("intervallo che non scavalca: invariato", () => {
      expect(clampCreateToSide(2, 3, 2, B)).toEqual({ startRow: 2, span: 3 });
    });
    it("senza pausa (boundary null): invariato", () => {
      expect(clampCreateToSide(6, 5, 6, null)).toEqual({ startRow: 6, span: 5 });
    });
  });

  describe("moveBlock con confine", () => {
    it("scavalcando verso il basso salta nel pomeriggio", () => {
      expect(moveBlock(6, 3, 1, 16, B)).toBe(8); // 7,8,9 → 8,9,10
    });
    it("scavalcando verso l'alto salta nel mattino", () => {
      expect(moveBlock(8, 3, -1, 16, B)).toBe(5); // 7,8,9 → 5,6,7
    });
    it("dentro una fascia: spostamento normale", () => {
      expect(moveBlock(9, 3, 1, 16, B)).toBe(10);
    });
  });

  describe("resize con confine", () => {
    it("il bordo superiore non risale oltre la pausa", () => {
      expect(resizeTop(10, 3, -5, B)).toEqual({ startRow: 8, span: 5 });
    });
    it("il bordo inferiore non scende oltre la pausa", () => {
      expect(resizeBottom(6, 1, 5, 16, B)).toEqual({ startRow: 6, span: 2 });
    });
  });
});

describe("columnAtOffset", () => {
  it("mappa l'offset X alla colonna, con clamp", () => {
    expect(columnAtOffset(0, 100, 5)).toBe(0);
    expect(columnAtOffset(150, 100, 5)).toBe(1);
    expect(columnAtOffset(-5, 100, 5)).toBe(0);
    expect(columnAtOffset(9999, 100, 5)).toBe(4);
  });

  it("larghezza non misurata (≤0) → colonna 0 (nessuno spostamento)", () => {
    expect(columnAtOffset(123, 0, 5)).toBe(0);
  });
});

describe("deltaRows", () => {
  it("arrotonda il delta in pixel a righe intere", () => {
    expect(deltaRows(0, 44)).toBe(0);
    expect(deltaRows(20, 44)).toBe(0); // < mezza riga
    expect(deltaRows(30, 44)).toBe(1); // > mezza riga
    expect(deltaRows(-30, 44)).toBe(-1);
    expect(deltaRows(88, 44)).toBe(2);
  });
});

describe("createRange", () => {
  it("intervallo inclusivo, indipendente dalla direzione del drag", () => {
    expect(createRange(2, 5)).toEqual({ startRow: 2, span: 4 });
    expect(createRange(5, 2)).toEqual({ startRow: 2, span: 4 });
    expect(createRange(3, 3)).toEqual({ startRow: 3, span: 1 }); // click = 1 slot
  });
});

describe("moveBlock", () => {
  it("sposta lo startRow mantenendo il blocco nei limiti", () => {
    expect(moveBlock(2, 3, 1, 16)).toBe(3);
    expect(moveBlock(2, 3, -5, 16)).toBe(0); // clamp in alto
    expect(moveBlock(13, 3, 5, 16)).toBe(13); // clamp in basso (16-3)
  });
});

describe("resizeTop", () => {
  it("muove il bordo superiore senza superare quello inferiore", () => {
    expect(resizeTop(4, 4, 1)).toEqual({ startRow: 5, span: 3 });
    expect(resizeTop(4, 4, -2)).toEqual({ startRow: 2, span: 6 });
    expect(resizeTop(4, 4, 10)).toEqual({ startRow: 7, span: 1 }); // span minimo 1
  });
});

describe("resizeBottom", () => {
  it("muove il bordo inferiore entro i limiti", () => {
    expect(resizeBottom(4, 2, 2, 16)).toEqual({ startRow: 4, span: 4 });
    expect(resizeBottom(4, 4, -10, 16)).toEqual({ startRow: 4, span: 1 }); // span minimo 1
    expect(resizeBottom(14, 1, 10, 16)).toEqual({ startRow: 14, span: 2 }); // clamp a 16
  });
});

describe("rowsToRange", () => {
  it("converte righe in minuti usando gli slot", () => {
    // 09:00 (540) per 2 slot da 30' → 540..600
    expect(rowsToRange(0, 2, SLOTS, 30)).toEqual({ startMin: 540, endMin: 600 });
    // pomeriggio: row 8 = 840 (14:00), 1 slot → 840..870
    expect(rowsToRange(8, 1, SLOTS, 30)).toEqual({ startMin: 840, endMin: 870 });
  });
});
