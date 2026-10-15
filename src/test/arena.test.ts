import { describe, expect, it } from "vitest";
import { recommendTopic, sessionMinutes } from "@/lib/arena";

const skills = [{ id: "s1", name: "Constitucional", topics: ["Remédios", "Direitos sociais"] }];

describe("arena", () => {
  it("recommends the first never-studied topic", () => {
    expect(recommendTopic(skills, [{ syllabus_topic: "Remédios", date: "2026-10-01" }])?.topic).toBe("Direitos sociais");
  });
  it("falls back to the topic studied longest ago", () => {
    const r = recommendTopic(skills, [{ syllabus_topic: "remédios", date: "2026-09-01" }, { syllabus_topic: "Direitos sociais", date: "2026-10-01" }]);
    expect(r?.topic).toBe("Remédios");
    expect(r?.reason).toBe("antigo");
  });
  it("credits session time between 1 and 360 minutes", () => {
    expect(sessionMinutes(0, 10_000)).toBe(1);
    expect(sessionMinutes(0, 25 * 60000)).toBe(25);
    expect(sessionMinutes(0, 9 * 3600000)).toBe(360);
  });
});

import { groupTopics, EXAM_BOARDS } from "@/lib/arena";
describe("groupTopics", () => {
  it("nests lowercase subtopics under the section heading", () => {
    const g = groupTopics(["Direito Civil: pessoas naturais", "domicílio", "Direito Empresarial: empresário", "estabelecimento"]);
    expect(g.map((x) => x.heading)).toEqual(["Direito Civil", "Direito Empresarial"]);
    expect(g[0]!.items.map((i) => i.label)).toEqual(["Pessoas naturais", "Domicílio"]);
    expect(g[1]!.items[1]!.topic).toBe("estabelecimento");
  });
  it("offers FAFIPA as a board", () => expect(EXAM_BOARDS).toContain("FAFIPA"));
});

import { matchSubject } from "@/lib/spreadsheet-import";
describe("matchSubject", () => {
  const skills = [{ id: "1", name: "Política Internacional" }, { id: "2", name: "Direito do Trabalho" }];
  it("suggests similar skill for prefixed name", () => {
    expect(matchSubject("(Diplomata - Política Internacional)", skills)).toEqual({ skill: skills[0], kind: "likely" });
  });
  it("exact match", () => { expect(matchSubject("direito do trabalho", skills)?.kind).toBe("exact"); });
  it("no match", () => { expect(matchSubject("Contabilidade", skills)).toBeNull(); });
});
