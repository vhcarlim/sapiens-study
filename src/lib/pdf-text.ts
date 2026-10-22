/** Browser-only helpers for reading uploads. Call from event handlers only. */
async function loadPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

/** Extracts the text of every page of a PDF. */
export async function readPdfPages(file: File, onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const doc = await loadPdf(file);
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    let line = "";
    for (const it of content.items) {
      if (!("str" in it)) continue;
      line += it.str + (it.hasEOL ? "\n" : " ");
    }
    pages.push(line.replace(/[ \t]+/g, " "));
    onProgress?.(n, doc.numPages);
  }
  await doc.cleanup();
  return pages;
}

const MAX_SIDE = 1600;

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/jpeg", 0.72);
}

/** Renders the given 1-based PDF pages to compressed JPEG data URLs (for scanned PDFs). */
export async function renderPdfPages(file: File, pageNumbers: number[], onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const doc = await loadPdf(file);
  const out: string[] = [];
  const wanted = pageNumbers.filter((n) => n >= 1 && n <= doc.numPages);
  for (const [i, n] of wanted.entries()) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2.5, MAX_SIDE / Math.max(base.width, base.height)) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Seu navegador não conseguiu desenhar a página.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
    out.push(canvasToJpeg(canvas));
    onProgress?.(i + 1, wanted.length);
  }
  await doc.cleanup();
  return out;
}

export async function pdfPageCount(file: File) {
  const doc = await loadPdf(file);
  const n = doc.numPages;
  await doc.cleanup();
  return n;
}

/** Resizes a photo/screenshot to a compressed JPEG data URL. */
export async function imageToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu ler a imagem.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvasToJpeg(canvas);
}

/** Parses "1-5, 8, 10-12" into sorted unique page numbers. Empty input returns null. */
export function parsePageRange(input: string, max = 9999): number[] | null {
  const s = input.trim();
  if (!s) return null;
  const set = new Set<number>();
  for (const part of s.split(/[,;\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`Intervalo de páginas inválido: "${part}". Use algo como 1-5, 8.`);
    const a = Number(m[1]), b = Number(m[2] ?? m[1]);
    for (let n = Math.min(a, b); n <= Math.max(a, b) && n <= max; n++) if (n >= 1) set.add(n);
  }
  return [...set].sort((x, y) => x - y);
}
