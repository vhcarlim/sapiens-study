export type DocumentChunk = { ref: string; text: string };
const words = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
/** Article/section boundaries, then bounded passages; no embedding or AI expense. */
export function chunkDocument(text: string): DocumentChunk[] {
  const sections = text.replace(/\r/g, "").split(/\n(?=\s*(?:Art\.?\s*\d|CAP[IÍ]TULO|SE[CÇ][AÃ]O|T[IÍ]TULO))/i);
  const out: DocumentChunk[] = [];
  for (const section of sections) {
    const heading = section.trim().split("\n")[0]?.slice(0, 100) ?? "Trecho";
    for (let i = 0; i < section.length; i += 1400) {
      const passage = section.slice(i, i + 1600).trim();
      if (passage) out.push({ ref: `${heading} · trecho ${out.length + 1}`, text: passage });
    }
  }
  return out;
}
export function retrieveChunks(chunks: DocumentChunk[], topic: string, max = 5): DocumentChunk[] {
  const terms = new Set(words(topic));
  return chunks.map((chunk, i) => ({ chunk, i, score: words(`${chunk.ref} ${chunk.text}`).reduce((n, w) => n + Number(terms.has(w)), 0) }))
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, max).map((x) => x.chunk);
}
export function validatedCitation(chunks: DocumentChunk[], index: number, quote: string): string | null {
  const chunk = chunks[index];
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  if (!chunk || normalize(quote).length < 30 || !normalize(chunk.text).includes(normalize(quote))) return null;
  return `${chunk.ref}\n“${normalize(quote)}”`;
}