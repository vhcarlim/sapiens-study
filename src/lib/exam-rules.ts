import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ExamBlock = Tables<"track_exam_blocks">;
export type SkillRule = Tables<"track_skill_rules">;

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Muito difícil",
  2: "Difícil",
  3: "Neutro",
  4: "Fácil",
  5: "Muito fácil",
};

export const examBlocksQuery = (trackId: string) => queryOptions({
  queryKey: ["exam_blocks", trackId],
  enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("track_exam_blocks").select("*").eq("track_id", trackId).order("position").order("created_at");
    if (error) throw error;
    return data;
  },
});

export const skillRulesQuery = (trackId: string) => queryOptions({
  queryKey: ["skill_rules", trackId],
  enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("track_skill_rules").select("*").eq("track_id", trackId);
    if (error) throw error;
    return data;
  },
});

type BlockLike = Pick<ExamBlock, "id" | "total_questions" | "weight">;
type RuleLike = Pick<SkillRule, "skill_id" | "block_id" | "questions" | "weight" | "difficulty">;

export type SkillExamWeight = {
  skillId: string;
  blockId: string | null;
  /** Expected questions (explicit or an even share of the block's remainder). */
  questions: number;
  /** True when questions were split evenly because the edital does not detail them. */
  estimated: boolean;
  weight: number;
  points: number;
  difficulty: number;
};

/**
 * Computes each skill's expected questions and points in the exam.
 * Inside a block, skills with explicit questions keep them; the block's remaining
 * questions are split evenly among the skills without a value.
 * Skills outside any block use their own questions and weight (default weight 1).
 */
export function computeExamWeights(skillIds: string[], blocks: BlockLike[], rules: RuleLike[]): SkillExamWeight[] {
  const ruleOf = new Map(rules.map((r) => [r.skill_id, r]));
  const blockOf = new Map(blocks.map((b) => [b.id, b]));
  const shareByBlock = new Map<string, number>();
  for (const b of blocks) {
    const members = skillIds.filter((id) => ruleOf.get(id)?.block_id === b.id);
    const fixed = members.reduce((n, id) => n + (ruleOf.get(id)?.questions ?? 0), 0);
    const open = members.filter((id) => ruleOf.get(id)?.questions == null).length;
    shareByBlock.set(b.id, open ? Math.max(0, b.total_questions - fixed) / open : 0);
  }
  return skillIds.map((skillId) => {
    const r = ruleOf.get(skillId);
    const block = r?.block_id ? blockOf.get(r.block_id) : undefined;
    const difficulty = r?.difficulty ?? 3;
    if (block) {
      const estimated = r?.questions == null;
      const questions = estimated ? shareByBlock.get(block.id) ?? 0 : r!.questions!;
      const weight = Number(block.weight);
      return { skillId, blockId: block.id, questions, estimated, weight, points: questions * weight, difficulty };
    }
    const questions = r?.questions ?? 0;
    const weight = r?.weight != null ? Number(r.weight) : 1;
    return { skillId, blockId: null, questions, estimated: false, weight, points: questions * weight, difficulty };
  });
}

export const fmtNum = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
