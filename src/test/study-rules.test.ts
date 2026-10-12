import { describe, expect, it } from "vitest";
import { studyDay, reviewEligible, minutesUntilStudyMidnight } from "@/lib/study-day";
import { canProtect } from "@/lib/engagement";

const act = (date: string) => ({ date, status: "approved", minutes: 30, quantity: 0, summary: null } as never);

describe("regras de estudo", () => {
  it("usa o dia de São Paulo, não UTC", () => {
    expect(studyDay(new Date("2026-10-13T01:30:00Z"))).toBe("2026-10-12");
  });
  it("arguição exige resumo de 30 caracteres", () => {
    expect(reviewEligible("a".repeat(29))).toBe(false);
    expect(reviewEligible("a".repeat(30))).toBe(true);
  });
  it("conta minutos até a meia-noite de São Paulo", () => {
    expect(minutesUntilStudyMidnight(new Date("2026-10-13T02:00:00Z"))).toBe(60);
  });
  it("protetor custa 100 XP e vale 2 por mês", () => {
    const now = new Date("2026-10-12T15:00:00Z");
    const acts = [act("2026-10-10")];
    expect(canProtect({ balance: 100, days: [], used: 0 }, acts, [], now)).toBe(true);
    expect(canProtect({ balance: 99, days: [], used: 0 }, acts, [], now)).toBe(false);
    expect(canProtect({ balance: 500, days: [], used: 2 }, acts, [], now)).toBe(false);
  });
});
