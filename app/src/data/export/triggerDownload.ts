/**
 * Avvia il download di un file di testo lato browser creando un blob temporaneo
 * e simulando il click su un anchor. Isolato in un modulo per poterlo mockare
 * nei test (jsdom non implementa `URL.createObjectURL`).
 */
export function triggerDownload(
  filename: string,
  text: string,
  mime = "application/json",
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
