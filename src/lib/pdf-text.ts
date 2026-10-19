/** Browser-only: extracts the text of every page of a PDF. Call from event handlers only. */
export async function readPdfPages(file: File, onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
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
