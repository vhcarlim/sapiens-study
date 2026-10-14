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
