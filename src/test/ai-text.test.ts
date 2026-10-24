import { describe, expect, it } from "vitest";
import { stripForeignScripts } from "@/lib/ai-text";

describe("stripForeignScripts", () => {
  it("removes Arabic leaked into Portuguese", () => {
    expect(stripForeignScripts("atuam para تنفيذ/apoio de atividades")).toBe("atuam para/apoio de atividades");
  });
  it("keeps Portuguese accents and Greek letters", () => {
    expect(stripForeignScripts("Ação com α e β")).toBe("Ação com α e β");
  });
});
