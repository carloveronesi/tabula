// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDictation } from "@/ui/useDictation";

/** Finto SpeechRecognition iniettabile: registra start/stop ed emette frasi. */
class FakeRec {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  emit(text: string, isFinal = true) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal, 0: { transcript: text } }],
    });
  }
}

describe("useDictation", () => {
  it("supported=false senza Web Speech API", () => {
    const { result } = renderHook(() => useDictation(() => {}, undefined));
    expect(result.current.supported).toBe(false);
  });

  it("toggle avvia il riconoscimento in it-IT continuo", () => {
    const rec = new FakeRec();
    const { result } = renderHook(() =>
      useDictation(() => {}, function () {
        return rec;
      } as never),
    );

    act(() => result.current.toggle());

    expect(result.current.listening).toBe(true);
    expect(rec.start).toHaveBeenCalledOnce();
    expect(rec.lang).toBe("it-IT");
    expect(rec.continuous).toBe(true);
  });

  it("le frasi finali arrivano a onText (ripulite)", () => {
    const rec = new FakeRec();
    const onText = vi.fn();
    const { result } = renderHook(() =>
      useDictation(onText, function () {
        return rec;
      } as never),
    );

    act(() => result.current.toggle());
    act(() => rec.emit("  ciao mondo  "));

    expect(onText).toHaveBeenCalledWith("ciao mondo");
  });

  it("un secondo toggle ferma il riconoscimento", () => {
    const rec = new FakeRec();
    const { result } = renderHook(() =>
      useDictation(() => {}, function () {
        return rec;
      } as never),
    );

    act(() => result.current.toggle());
    act(() => result.current.toggle());

    expect(rec.stop).toHaveBeenCalledOnce();
    expect(result.current.listening).toBe(false);
  });

  it("onend (silenzio/stop del browser) azzera lo stato", () => {
    const rec = new FakeRec();
    const { result } = renderHook(() =>
      useDictation(() => {}, function () {
        return rec;
      } as never),
    );

    act(() => result.current.toggle());
    act(() => rec.onend?.());

    expect(result.current.listening).toBe(false);
  });
});
