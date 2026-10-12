/** Merges syllabus topics keeping original order, removing case-insensitive duplicates. */
export function mergeTopics(existing: string[] | null | undefined, incoming: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...(existing ?? []), ...incoming]) {
    const v = t.trim().slice(0, 300);
    const k = v.toLowerCase();
    if (!v || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.slice(0, 300);
}

/** Topics offered for the selected skills of an activity. */
export function topicOptions(skills: { id: string; topics: string[] | null }[], selected: string[]): string[] {
  return mergeTopics([], skills.filter((s) => selected.includes(s.id)).flatMap((s) => s.topics ?? []));
}
