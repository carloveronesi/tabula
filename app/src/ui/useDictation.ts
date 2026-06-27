import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Sottoinsieme della Web Speech API che ci serve. Non è nei lib DOM standard e
 * varia tra browser (`SpeechRecognition` / `webkitSpeechRecognition`).
 */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
interface SpeechResultEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
type SRConstructor = new () => SpeechRecognitionLike;

function defaultCtor(): SRConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * Dettatura vocale (it-IT) in modalità toggle continuo: `toggle` avvia/ferma il
 * riconoscimento; ogni frase finale viene passata a `onText` per l'inserimento.
 * Su browser senza Web Speech API (es. Firefox) `supported` è `false` e l'UI
 * non mostra il microfono. `Ctor` è iniettabile per i test.
 */
export function useDictation(
  onText: (text: string) => void,
  Ctor: SRConstructor | undefined = defaultCtor(),
): { supported: boolean; listening: boolean; toggle: () => void } {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const ensureRec = useCallback(() => {
    if (recRef.current || !Ctor) return recRef.current;
    const rec = new Ctor();
    rec.lang = "it-IT";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      text = text.trim();
      if (text) onTextRef.current(text);
    };
    // ponytail: i browser fermano il riconoscimento dopo un silenzio lungo
    // anche con continuous=true; qui ci si ferma, niente auto-restart. Se
    // serve dettatura ininterrotta, riavviare in onend finché l'utente è attivo.
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return rec;
  }, [Ctor]);

  const toggle = useCallback(() => {
    const rec = ensureRec();
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      rec.start();
      setListening(true);
    }
  }, [ensureRec, listening]);

  useEffect(() => () => recRef.current?.stop(), []);

  return { supported: Boolean(Ctor), listening, toggle };
}
