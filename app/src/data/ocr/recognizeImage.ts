/**
 * Adapter OCR su Tesseract.js. Tutto resta sul dispositivo: worker, core wasm e
 * lingua sono serviti da `public/tesseract/` (vedi `npm run setup:ocr`), mai da
 * CDN. Il modulo è caricato con `import()` dinamico dalla UI, così il wasm non
 * pesa sull'avvio della PWA.
 */

export interface OcrProgress {
  /** 0..1, avanzamento del riconoscimento. */
  progress: number;
  /** Etichetta dello stadio corrente (utile per la UI). */
  status: string;
}

const BASE = import.meta.env.BASE_URL;
const paths = {
  workerPath: `${BASE}tesseract/worker.min.js`,
  corePath: `${BASE}tesseract/core`,
  langPath: `${BASE}tesseract/lang`,
};

/**
 * Pre-processa l'immagine per l'OCR: scala di grigi, upscale e — quando lo sfondo
 * è scuro (cronologia Teams in tema scuro) — inversione, così Tesseract vede
 * testo scuro su chiaro. Ritorna un canvas pronto da riconoscere.
 *
 * L'upscale è adattivo: 3× per le immagini piccole (vista settimana, testo
 * minuto), 2× per quelle già grandi, con un tetto sui pixel totali per non far
 * esplodere memoria/tempo. Più pixel = OCR più pulito sul testo fino.
 */
function preprocess(bitmap: ImageBitmap): HTMLCanvasElement {
  const px = bitmap.width * bitmap.height;
  const scale = px * 9 <= 30_000_000 ? 3 : px * 4 <= 30_000_000 ? 2 : 1;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponibile");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let sum = 0;
  const lum = new Float32Array(d.length / 4);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    lum[j] = g;
    sum += g;
  }
  const invert = sum / lum.length < 128; // sfondo prevalentemente scuro
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = invert ? 255 - lum[j] : lum[j];
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Una parola riconosciuta col suo riquadro, in pixel del canvas pre-processato. */
export interface OcrWord {
  text: string;
  /** Confidenza 0..100 di Tesseract: utile per scartare icone/barre lette male. */
  confidence: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Riconoscimento con geometria: parole + testo grezzo + dimensioni del canvas. */
export interface OcrLayout {
  words: OcrWord[];
  text: string;
  width: number;
  height: number;
}

/**
 * Esegue l'OCR su un'immagine pre-processata e ritorna la pagina Tesseract con le
 * dimensioni del canvas. Worker creato e terminato a ogni chiamata: uso
 * occasionale, non vale tenerlo vivo.
 */
async function runOcr(source: Blob, onProgress?: (p: OcrProgress) => void) {
  const { createWorker } = await import("tesseract.js");
  const bitmap = await createImageBitmap(source);
  const canvas = preprocess(bitmap);
  bitmap.close?.();

  const worker = await createWorker("ita", 1, {
    ...paths,
    logger: onProgress
      ? (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            onProgress({ progress: m.progress, status: m.status });
          }
        }
      : undefined,
  });
  try {
    // tesseract.js v6+: `recognize` ritorna solo il testo se non si chiede altro.
    // `blocks: true` serve per i riquadri (bbox) di righe/parole, che usa l'import
    // dal calendario per ricavare gli orari dalla geometria.
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    return { page: data, width: canvas.width, height: canvas.height };
  } finally {
    await worker.terminate();
  }
}

/** Riconosce il testo di un'immagine (file o blob) in italiano. */
export async function recognizeImage(
  source: Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const { page } = await runOcr(source, onProgress);
  return page.text;
}

/**
 * Come `recognizeImage`, ma conserva la geometria a livello di *parola*: ogni
 * parola col suo riquadro. Serve a chi legge un layout a griglia (il calendario),
 * dove Tesseract fonde in un'unica "riga" testo di colonne diverse: solo i
 * riquadri delle singole parole restano fedeli alla posizione reale.
 */
export async function recognizeLayout(
  source: Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrLayout> {
  const { page, width, height } = await runOcr(source, onProgress);
  const words: OcrWord[] = [];
  for (const block of page.blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        for (const word of line.words) {
          const text = word.text.trim();
          if (text) {
            words.push({
              text,
              confidence: word.confidence,
              x0: word.bbox.x0,
              y0: word.bbox.y0,
              x1: word.bbox.x1,
              y1: word.bbox.y1,
            });
          }
        }
      }
    }
  }
  return { words, text: page.text, width, height };
}
