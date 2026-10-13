import { describe, expect, it } from "vitest";
import { inferActivityType } from "@/lib/data";

describe("inferActivityType", () => {
  it("detects simulados", () => expect(inferActivityType("Simulado PF", "Leitura/Simulado/Técnicas")).toBe("mock"));
  it("detects provas reais", () => expect(inferActivityType("Prova Polícia Federal", "Leitura/Simulado/Técnicas")).toBe("exam"));
  it("detects leituras", () => expect(inferActivityType("Livro Sapiens", "Leitura/Simulado/Técnicas")).toBe("reading"));
  it("keeps regular subjects as lessons", () => expect(inferActivityType("(AFT) Direito do Trabalho", "")).toBe("lesson"));
});
