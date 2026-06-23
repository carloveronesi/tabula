/**
 * Prepara gli asset OCR (Tesseract) in `public/tesseract/` perché la PWA
 * funzioni offline, senza scaricare nulla da CDN a runtime.
 *
 * Copia worker e core da `node_modules` (deterministico) e scarica una volta il
 * traineddata italiano se manca. Gli asset sono gitignored: rigenerali con
 * `npm run setup:ocr` dopo un clone o un aggiornamento di tesseract.js.
 */
import { mkdir, copyFile, access, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "tesseract");
const coreOut = join(out, "core");
const langOut = join(out, "lang");

const coreSrc = join(root, "node_modules", "tesseract.js-core");
const workerSrc = join(root, "node_modules", "tesseract.js", "dist", "worker.min.js");

// Varianti LSTM caricabili secondo le capacità del browser (relaxed SIMD / SIMD /
// base): Tesseract sceglie a runtime, quindi servono tutte e tre.
const CORE_FILES = [
  "tesseract-core-relaxedsimd-lstm.js",
  "tesseract-core-relaxedsimd-lstm.wasm",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
  "tesseract-core-simd-lstm.js",
  "tesseract-core-simd-lstm.wasm",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-lstm.js",
  "tesseract-core-lstm.wasm",
  "tesseract-core-lstm.wasm.js",
];

const LANG = "ita.traineddata.gz";
const LANG_URL = `https://tessdata.projectnaptha.com/4.0.0/${LANG}`;

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(coreOut, { recursive: true });
  await mkdir(langOut, { recursive: true });

  await copyFile(workerSrc, join(out, "worker.min.js"));
  for (const f of CORE_FILES) await copyFile(join(coreSrc, f), join(coreOut, f));
  console.log(`✓ worker + ${CORE_FILES.length} core copiati da node_modules`);

  const langPath = join(langOut, LANG);
  if (await exists(langPath)) {
    const { size } = await stat(langPath);
    console.log(`✓ ${LANG} già presente (${(size / 1e6).toFixed(1)} MB)`);
    return;
  }

  console.log(`↓ scarico ${LANG}…`);
  const res = await fetch(LANG_URL);
  if (!res.ok) throw new Error(`Download fallito: HTTP ${res.status}`);
  await pipeline(res.body, createWriteStream(langPath));
  const { size } = await stat(langPath);
  console.log(`✓ ${LANG} scaricato (${(size / 1e6).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.error("setup-ocr:", e.message);
  process.exit(1);
});
