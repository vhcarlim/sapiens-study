import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { respond } from "@/lib/arena.functions";
import type { ExamQuestion } from "@/lib/past-exams";

const schema = {
  type: "object", additionalProperties: false, required: ["questions"],
  properties: {
    questions: { type: "array", items: { type: "object", additionalProperties: false, required: ["number", "statement", "options", "answer"], properties: {
      number: { type: "integer" }, statement: { type: "string" },
      options: { type: "array", items: { type: "object", additionalProperties: false, required: ["letter", "text"], properties: { letter: { type: "string" }, text: { type: "string" } } } },
      answer: { type: "string" },
    } } },
  },
};

/** Extracts objective questions from a past exam and matches each with the official answer key. Nothing is saved here. */
export const extractPastExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ exam: z.string().min(50).max(300000), key: z.string().min(5).max(60000), role: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data }) => {
    const instructions = `Você recebe o texto de um caderno de prova de concurso e o texto do gabarito oficial.
Extraia TODAS as questões objetivas na ordem, com número, enunciado completo (incluindo texto-base resumido quando necessário), alternativas (letras A–E, ou "C"/"E" para Certo/Errado) e a resposta oficial do gabarito para aquele número.
${data.role ? `Se o gabarito tiver vários cargos/tipos de prova, use apenas o de: ${data.role}.` : ""}
Ignore questões anuladas (sem resposta no gabarito) e questões discursivas. Não invente conteúdo: copie o texto da prova. A resposta deve ser apenas a letra.`;
    const text = await respond(instructions, [{ role: "user", content: `PROVA:\n${data.exam}\n\nGABARITO:\n${data.key}` }], { name: "past_exam", schema }, "low");
    const parsed = JSON.parse(text) as { questions: ExamQuestion[] };
    const questions = parsed.questions.filter((q) => q.options.length >= 2 && q.options.some((o) => o.letter === q.answer));
    if (!questions.length) throw new Error("Não encontrei questões com gabarito correspondente.");
    return questions;
  });
