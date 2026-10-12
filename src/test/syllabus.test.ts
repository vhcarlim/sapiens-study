import { describe, expect, it } from "vitest";
import { mergeTopics, topicOptions } from "@/lib/syllabus";

describe("syllabus topics", () => {
  it("merges new topics without duplicating existing ones", () => {
    expect(mergeTopics(["Software"], ["software", "Redes"])).toEqual(["Software", "Redes"]);
  });
  it("offers only topics from the selected subjects", () => {
    const skills = [
      { id: "info", topics: ["Conceitos de informática", "Software"] },
      { id: "port", topics: ["Crase"] },
    ];
    expect(topicOptions(skills, ["info"])).toEqual(["Conceitos de informática", "Software"]);
  });
});
