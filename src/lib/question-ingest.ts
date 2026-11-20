import { canonicalSubject } from "@/lib/subjects";
import { z } from "zod";
import { bankKey } from "@/lib/ai-quota";

/** One enriched official question as sent by the external ingestion script. */
export const IngestQuestion = z.object({
  board: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(2).max(200),
  topic: z.string().trim().min(2).max(200),
  format: z.enum(["multipla", "certo_errado"]),
  context: z.string().max(8000).default(""),
  statement: z.string().trim().min(10).max(8000),
  options: z.array(z.object({ letter: z.string().regex(/^[A-EC]$/), text: z.string().trim().min(1).max(3000) })).min(2).max(5),
  answer: z.string().regex(/^[A-E]$/),
  explanations: z.array(z.object({ letter: z.string().regex(/^[A-E]$/), why: z.string().trim().min(5).max(3000) })).min(2).max(5),
  trap: z.string().trim().max(2000).default(""),
  basis: z.string().trim().max(2000).default(""),
  fingerprint: z.string().trim().min(5).max(400),
  origin: z.object({
    exam: z.string().trim().max(200).optional(),
    year: z.number().int().min(1980).max(2100).optional(),
    role: z.string().trim().max(200).optional(),
    number: z.number().int().min(1).max(500).optional(),
  }).default({}),
}).superRefine((q, ctx) => {
  const letters = q.options.map((o) => o.letter);
  if (new Set(letters).size !== letters.length) ctx.addIssue({ code: "custom", message: "Letras de alternativas repetidas" });
  if (q.format === "certo_errado" && (letters.join("") !== "CE" || !["C", "E"].includes(q.answer))) ctx.addIssue({ code: "custom", message: "Certo/Errado exige opções C e E" });
  if (q.format === "multipla" && letters.join("") !== "ABCDE".slice(0, letters.length)) ctx.addIssue({ code: "custom", message: "Alternativas devem ser A, B, C… em ordem" });
  if (!letters.includes(q.answer)) ctx.addIssue({ code: "custom", message: "Gabarito não corresponde a nenhuma alternativa" });
  const expl = new Set(q.explanations.map((e) => e.letter));
  if (letters.some((l) => !expl.has(l))) ctx.addIssue({ code: "custom", message: "Falta explicação para alguma alternativa" });
});
export type IngestQuestion = z.infer<typeof IngestQuestion>;

export const IngestBody = z.object({ questions: z.array(z.unknown()).min(1).max(50) });

/** Payload stored in question_bank (matches what the Arena reads). */
export function toPayload(q: IngestQuestion) {
  return { format: q.format, context: q.context, statement: q.statement, options: q.options, answer: q.answer, explanations: q.explanations, trap: q.trap, basis: q.basis, fingerprint: q.fingerprint, origin: q.origin };
}
export type StoredPayload = ReturnType<typeof toPayload>;

/** Bank keys for an ingested question; null when the subject is outside the canonical list. */
export function bankKeys(q: IngestQuestion) {
  const subject_key = canonicalSubject(q.subject);
  if (!subject_key) return null;
  return { board_key: bankKey(q.board), subject_key, topic_key: bankKey(q.topic) };
}

function tokens(p: Pick<StoredPayload, "statement" | "options">) {
  const text = `${p.statement} ${p.options.map((o) => o.text).join(" ")}`;
  return new Set(bankKey(text.slice(0, 20000) ).split(" ").filter((t) => t.length > 2));
}

/** Jaccard similarity of statement+options words (0..1). */
export function similarity(a: Pick<StoredPayload, "statement" | "options">, b: Pick<StoredPayload, "statement" | "options">) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}
export const DUPLICATE_THRESHOLD = 0.85;

/** How pedagogically complete a question is: more justified content wins. */
export function completeness(p: Partial<StoredPayload>) {
  const len = (s?: string) => (s ?? "").trim().length;
  const expl = (p.explanations ?? []).reduce((n, e) => n + Math.min(len(e.why), 800), 0);
  return expl + Math.min(len(p.trap), 600) + Math.min(len(p.basis), 600) + Math.min(len(p.context), 400) + (p.explanations?.length ?? 0) * 50;
}

export type Decision = { action: "insert" } | { action: "skip"; id: string } | { action: "replace"; id: string };

/** Keeps only the most complete version among identical/near-identical questions. */
export function decide(incoming: StoredPayload, existing: { id: string; payload: Partial<StoredPayload> }[]): Decision {
  let best: { id: string; payload: Partial<StoredPayload>; sim: number } | null = null;
  for (const row of existing) {
    if (!row.payload?.statement || !row.payload.options) continue;
    const sim = similarity(incoming, row.payload as StoredPayload);
    if (sim >= DUPLICATE_THRESHOLD && (!best || sim > best.sim)) best = { ...row, sim };
  }
  if (!best) return { action: "insert" };
  return completeness(incoming) > completeness(best.payload) ? { action: "replace", id: best.id } : { action: "skip", id: best.id };
}

/** Constant-time string comparison (Workers runtime has no timingSafeEqual by default). */
export function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
