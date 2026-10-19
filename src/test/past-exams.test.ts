import { describe, expect, it } from "vitest";
import { daysUntil, examBadge } from "@/lib/past-exams";

describe("insígnias de prova", () => {
  it("100% vale Gabaritou", () => expect(examBadge(80, 80)?.id).toBe("gabarito"));
  it("90% vale Domínio de Elite", () => expect(examBadge(72, 80)?.id).toBe("elite"));
  it("80% vale Alto Rendimento", () => expect(examBadge(64, 80)?.id).toBe("alto"));
  it("70% vale Nota de Corte", () => expect(examBadge(56, 80)?.id).toBe("corte"));
  it("abaixo de 70% vale Combatente de Prova", () => expect(examBadge(10, 80)?.id).toBe("combatente"));
  it("sem nota não há insígnia", () => expect(examBadge(null, null)).toBeNull());
});
describe("contagem regressiva", () => {
  it("conta dias corridos até a prova", () => expect(daysUntil("2026-11-30", "2026-10-19")).toBe(42));
  it("fica negativa depois da prova", () => expect(daysUntil("2026-10-18", "2026-10-19")).toBe(-1));
});
