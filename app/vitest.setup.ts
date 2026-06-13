// Setup globale dei test. Aggiunge i matcher DOM (toBeInTheDocument, ecc.)
// usati dai test dei componenti in jsdom.
import "@testing-library/jest-dom/vitest";

// jsdom non implementa PointerEvent: lo deriviamo da MouseEvent così che
// clientX/clientY (e pointerId) viaggino nei test di drag (Pointer Events).
if (typeof window !== "undefined" && !("PointerEvent" in window)) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  }
  // @ts-expect-error: assegnazione del polyfill al global di jsdom
  window.PointerEvent = PointerEventPolyfill;
}
