import { describe, expect, it } from "vitest";
import { inferActivityType } from "@/lib/data";

describe("inferActivityType", () => {
  it("detects simulados", () => expect(inferActivityType("Leitura/Simulado/Técnicas", "Simulado PF")).toBe("mock"));
  it("detects provas reais", () => expect(inferActivityType("Leitura/Simulado/Técnicas", "Prova Polícia Federal")).toBe("exam"));
  it("detects leituras", () => expect(inferActivityType("Leitura/Simulado/Técnicas", "Livro Sapiens")).toBe("reading"));
  it("keeps regular subjects as lessons", () => expect(inferActivityType("(AFT) Direito do Trabalho", "")).toBe("lesson"));
});
