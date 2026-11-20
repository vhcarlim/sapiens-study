import { topicScore } from "@/lib/subjects";

/** Orders candidate bank rows: same board first, then closest topic, randomised within ties. */
export function rankBankRows<T extends { board_key: string; topic_key: string }>(rows: T[], keys: { board_key: string; topic_key: string }, rand: () => number = Math.random): T[] {
  return rows
    .map((r) => ({ r, s: (r.board_key === keys.board_key ? 2 : 0) + topicScore(r.topic_key, keys.topic_key), j: rand() }))
    .sort((a, b) => b.s - a.s || a.j - b.j)
    .map((x) => x.r);
}
