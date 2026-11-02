import type { ArenaObjective } from "@/lib/arena";

/** Shuffles multiple-choice alternatives (Fisher–Yates) and relabels letters, answer and explanations, so the correct answer is evenly spread over A–E regardless of model bias. Certo/Errado is left untouched. */
export function shuffleObjective<T extends ArenaObjective>(q: T, rand: () => number = Math.random): T {
  if (q.format !== "multipla" || q.options.length < 2) return q;
  const opts = [...q.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [opts[i], opts[j]] = [opts[j]!, opts[i]!];
  }
  const letters = q.options.map((o) => o.letter);
  const map = new Map(opts.map((o, i) => [o.letter, letters[i]!]));
  return {
    ...q,
    options: opts.map((o, i) => ({ letter: letters[i]!, text: o.text })),
    answer: map.get(q.answer) ?? q.answer,
    explanations: q.explanations
      .map((e) => ({ letter: map.get(e.letter) ?? e.letter, why: e.why }))
      .sort((a, b) => letters.indexOf(a.letter) - letters.indexOf(b.letter)),
  };
}
