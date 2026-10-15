/** Parses AprovadoApp-style spreadsheets (CSV or pasted from Google Sheets) into study sessions. */
export type SheetSession = { date: string; subject: string; content: string | null; minutes: number; notes: string | null };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Splits CSV/TSV text, honoring quoted cells with line breaks. */
export function splitRows(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = first.includes("\t") ? "\t" : (first.split(";").length > first.split(",").length ? ";" : ",");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** "13/08/2024 07:30" or "2024-08-13" → "2024-08-13". */
export function parseDate(v: string): string | null {
  const s = v.trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const y = m[3]!.length === 2 ? `20${m[3]}` : m[3];
    const d = Number(m[1]), mo = Number(m[2]);
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** "5h 30m", "1:30", "90" → minutes. */
export function parseDuration(v: string): number | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (/^\d+([.,]\d+)?$/.test(s)) return Math.round(Number(s.replace(",", ".")));
  let m = s.match(/^(\d+):(\d{2})(?::\d{2})?$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = s.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/);
  if (m && (m[1] || m[2])) return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
  return null;
}

export function parseSheet(text: string): { sessions: SheetSession[]; skipped: number } {
  const rows = splitRows(text);
  const hi = rows.findIndex((r) => r.some((c) => norm(c) === "materia"));
  if (hi < 0) throw new Error("Cabeçalho não encontrado: inclua a linha com Início, Matéria e Duração.");
  const h = rows[hi]!.map(norm);
  const col = (...names: string[]) => h.findIndex((c) => names.includes(c));
  const iDate = col("inicio", "data"), iSub = col("materia"), iCont = col("conteudo");
  const iMin = col("duracao (minutos)", "minutos"), iDur = col("duracao"), iNotes = col("anotacoes", "observacoes");
  if (iDate < 0 || (iMin < 0 && iDur < 0)) throw new Error("Colunas Início e Duração são obrigatórias.");
  const sessions: SheetSession[] = [];
  let skipped = 0;
  for (const r of rows.slice(hi + 1)) {
    const date = parseDate(r[iDate] ?? "");
    const subject = (r[iSub] ?? "").trim();
    const minutes = (iMin >= 0 ? parseDuration(r[iMin] ?? "") : null) ?? (iDur >= 0 ? parseDuration(r[iDur] ?? "") : null);
    if (!date || !subject || minutes == null || minutes <= 0) { skipped++; continue; }
    const content = iCont >= 0 ? (r[iCont] ?? "").trim() || null : null;
    const notes = iNotes >= 0 ? (r[iNotes] ?? "").trim() || null : null;
    sessions.push({ date, subject: subject.slice(0, 120), content: content?.slice(0, 300) ?? null, minutes: Math.min(minutes, 1440), notes: notes?.slice(0, 2000) ?? null });
  }
  return { sessions, skipped };
}

/** Short title: content, else first sentence of notes, else subject. */
export function sessionTitle(s: SheetSession): string {
  const base = s.content ?? s.notes?.split(/[.\n;]/)[0]?.trim() ?? "";
  return (base || `Estudo — ${s.subject}`).slice(0, 200);
}

/** Excel rows (Date/number/string cells) → tab-separated text that parseSheet understands. */
export function sheetRowsToText(rows: unknown[][]): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const cell = (v: unknown) => {
    if (v instanceof Date) return `${pad(v.getDate())}/${pad(v.getMonth() + 1)}/${v.getFullYear()} ${pad(v.getHours())}:${pad(v.getMinutes())}`;
    return v == null ? "" : String(v).replace(/[\t\r\n]+/g, " ");
  };
  return rows.map((r) => Array.from(r, cell).join("\t")).join("\n");
}

const STOP = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "em", "para", "na", "no"]);
/** Strips parentheses, "Prefix - " labels, accents and punctuation. */
export function cleanSubject(s: string): string {
  let t = norm(s).replace(/[()[\]{}]/g, " ").trim();
  if (/\s[-–—:]\s/.test(t)) t = t.split(/\s[-–—:]\s/).pop()!;
  return t.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
const words = (s: string) => new Set(cleanSubject(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w)));

/** Best similar skill for a sheet subject: exact match, or likely (cleaned/word overlap). */
export function matchSubject<T extends { id: string; name: string }>(subject: string, skills: T[]): { skill: T; kind: "exact" | "likely" } | null {
  const exact = skills.find((s) => s.name.trim().toLowerCase() === subject.trim().toLowerCase());
  if (exact) return { skill: exact, kind: "exact" };
  const c = cleanSubject(subject), a = words(subject);
  let best: T | null = null, score = 0;
  for (const s of skills) {
    const cs = cleanSubject(s.name);
    if (cs && cs === c) return { skill: s, kind: "likely" };
    const b = words(s.name);
    const inter = [...a].filter((w) => b.has(w)).length;
    const sc = inter / Math.max(1, Math.min(a.size, b.size));
    const contained = cs.length > 3 && (c.includes(cs) || cs.includes(c));
    const v = contained ? Math.max(sc, 0.9) : sc;
    if (v > score) { score = v; best = s; }
  }
  return best && score >= 0.6 ? { skill: best, kind: "likely" } : null;
}
