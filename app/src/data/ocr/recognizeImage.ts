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

// Tetto sui pixel del canvas scalato: limita memoria/tempo dell'integral image.
const MAX_SCALED_PX = 18_000_000;
// Bradley: un pixel è testo se sta sotto la media locale di almeno questa frazione.
const BRADLEY_T = 0.15;

/**
 * Pre-processa l'immagine per l'OCR: scala di grigi, upscale, e — quando lo sfondo
 * è scuro (temi scuri di Teams/Outlook) — inversione, poi **sogliatura adattiva
 * locale (Bradley)**. La binarizzazione confronta ogni pixel con la media del suo
 * intorno (calcolata in O(1) con un'integral image), così il testo grigio tenue su
 * sfondo scuro — che una soglia globale perde — viene staccato e reso nero pieno.
 * Ritorna un canvas binario pronto da riconoscere.
 *
 * L'upscale è adattivo (3× per le immagini piccole, poi 2×, poi 1×) sotto al tetto
 * di pixel: più pixel = testo fino più leggibile.
 */
function preprocess(bitmap: ImageBitmap): HTMLCanvasElement {
  const px = bitmap.width * bitmap.height;
  const scale = px * 9 <= MAX_SCALED_PX ? 3 : px * 4 <= MAX_SCALED_PX ? 2 : 1;
  const canvas = document.createElement("canvas");
  const W = (canvas.width = bitmap.width * scale);
  const H = (canvas.height = bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponibile");
  ctx.drawImage(bitmap, 0, 0, W, H);

  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const N = W * H;
  let sum = 0;
  const lum = new Float32Array(N);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    lum[j] = g;
    sum += g;
  }
  // Tema scuro → inverti, così il testo diventa scuro su chiaro (atteso da Bradley).
  if (sum / N < 128) for (let j = 0; j < N; j++) lum[j] = 255 - lum[j];

  // Integral image: somma cumulativa, bordo di zeri a sinistra/in alto.
  const IW = W + 1;
  const integral = new Float64Array(IW * (H + 1));
  for (let y = 0; y < H; y++) {
    let rowSum = 0;
    const above = y * IW;
    const cur = (y + 1) * IW;
    for (let x = 0; x < W; x++) {
      rowSum += lum[y * W + x];
      integral[cur + x + 1] = integral[above + x + 1] + rowSum;
    }
  }

  // Finestra ~ una riga di testo, scalata con l'upscale.
  const r = 8 * scale;
  for (let y = 0; y < H; y++) {
    const y0 = y - r < 0 ? 0 : y - r;
    const y1 = y + r >= H ? H - 1 : y + r;
    for (let x = 0; x < W; x++) {
      const x0 = x - r < 0 ? 0 : x - r;
      const x1 = x + r >= W ? W - 1 : x + r;
      const count = (x1 - x0 + 1) * (y1 - y0 + 1);
      const area =
        integral[(y1 + 1) * IW + (x1 + 1)] -
        integral[y0 * IW + (x1 + 1)] -
        integral[(y1 + 1) * IW + x0] +
        integral[y0 * IW + x0];
      const isText = lum[y * W + x] * count <= area * (1 - BRADLEY_T);
      const v = isText ? 0 : 255;
      const i = (y * W + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
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
