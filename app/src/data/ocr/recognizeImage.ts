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
 */
function preprocess(bitmap: ImageBitmap, scale = 2): HTMLCanvasElement {
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

/**
 * Riconosce il testo di un'immagine (file o blob) in italiano. `onProgress`
 * riceve l'avanzamento per la UI. Il worker viene creato e terminato a ogni
 * chiamata: l'uso è occasionale, non vale tenerlo vivo.
 */
export async function recognizeImage(
  source: Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
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
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
