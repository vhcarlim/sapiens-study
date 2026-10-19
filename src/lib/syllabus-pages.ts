/** Pure helpers to narrow a full public-exam notice down to its syllabus pages before AI extraction. */

export const MAX_SYLLABUS_CHARS = 300_000;

const SYLLABUS_RE = /conte[uú]dos?\s+program[aá]tico|objetos?\s+de\s+avalia[cç][aã]o|conhecimentos\s+(b[aá]sicos|gerais|espec[ií]ficos|comuns)/i;

function norm(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Keeps pages from the syllabus section onwards (skipping an early table of contents),
 * plus any earlier page mentioning the target position. Returns page-tagged text.
 */
export function selectSyllabusPages(pages: string[], role: string): { text: string; pages: number[] } {
  const r = norm(role.trim());
  const hits = pages.map((p, i) => (SYLLABUS_RE.test(p) ? i : -1)).filter((i) => i >= 0);
  // Ignore matches in the first pages (summary/index) when later matches exist.
  const start = hits.find((i) => i >= 3 && i >= Math.floor(pages.length * 0.15)) ?? hits[0] ?? 0;
  const keep = pages
    .map((p, i) => i)
    .filter((i) => i >= start || (r.length >= 3 && norm(pages[i] ?? "").includes(r)));
  const out: number[] = [];
  let text = "";
  for (const i of keep) {
    const chunk = `\n\n[[PÁGINA ${i + 1}]]\n${(pages[i] ?? "").trim()}`;
    if (text.length + chunk.length > MAX_SYLLABUS_CHARS) break;
    text += chunk;
    out.push(i + 1);
  }
  return { text: text.trim(), pages: out };
}
