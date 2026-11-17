/** Caderno de Memória: distills Arena rounds into durable learnings (no extra AI call). */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { ArenaObjective } from "@/lib/arena";

export type Learning = Tables<"study_learnings">;
export type LearningKind = "rule" | "trap" | "mistake" | "chat" | "note";
export const KINDS: Record<LearningKind, { label: string; tag: string; cls: string }> = {
  rule: { label: "Regra-chave", tag: "#Regra", cls: "border-l-primary" },
  trap: { label: "Pegadinha da banca", tag: "#Pegadinha", cls: "border-l-warning" },
  mistake: { label: "Ponto cego", tag: "#Erro", cls: "border-l-destructive" },
  chat: { label: "Dúvida do chat", tag: "#Chat", cls: "border-l-chart-2" },
  note: { label: "Anotação", tag: "#Nota", cls: "border-l-muted-foreground" },
};

type Round = { q: ArenaObjective; picked: string | null; chat: { role: "user" | "assistant"; content: string }[] };
export type LearningDraft = { kind: LearningKind; title: string; detail: string | null };
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

/** One answered round → rule, trap, mistake (if wrong) and chat insight (if discussed). */
export function distillRound(r: Round): LearningDraft[] {
  if (!r.picked) return [];
  const { q } = r;
  const correct = q.options.find((o) => o.letter === q.answer);
  const out: LearningDraft[] = [];
  if (q.basis?.trim()) out.push({ kind: "rule", title: cut(q.basis.trim(), 500), detail: correct ? cut(`Correta (${q.answer}): ${correct.text}`, 4000) : null });
  if (q.trap?.trim()) out.push({ kind: "trap", title: cut(q.trap.trim(), 500), detail: null });
  if (r.picked !== q.answer) {
    const picked = q.options.find((o) => o.letter === r.picked);
    const why = q.explanations.find((e) => e.letter === r.picked)?.why;
    out.push({ kind: "mistake", title: cut(`Marquei ${r.picked}: ${picked?.text ?? ""}`, 500), detail: why ? cut(why, 4000) : null });
  }
  const asks = r.chat.filter((m) => m.role === "user");
  const last = [...r.chat].reverse().find((m) => m.role === "assistant");
  if (asks.length && last) out.push({ kind: "chat", title: cut(asks.at(-1)!.content.trim(), 500), detail: cut(last.content.trim(), 4000) });
  return out;
}

export const learningsQuery = (trackId: string) => queryOptions({
  queryKey: ["learnings", trackId],
  queryFn: async () => {
    const { data, error } = await supabase.from("study_learnings").select("*").eq("track_id", trackId).order("created_at", { ascending: false }).limit(2000);
    if (error) throw error;
    return data;
  },
});

export async function saveLearnings(base: { track_id: string; skill_id: string | null; topic: string; source: "arena" | "manual"; session_key?: string }, drafts: LearningDraft[]) {
  if (!drafts.length) return;
  const { error } = await supabase.from("study_learnings").insert(drafts.map((d) => ({ ...base, ...d })));
  if (error) throw error;
}
