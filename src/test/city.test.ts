import { describe, it, expect } from "vitest";
import { citadelStage, towerHeight, arenaTier, overdueCount, lighthouseIntensity } from "@/lib/city";

describe("Cidade Sapiens", () => {
  it("nível vira 5 estágios da cidadela", () => {
    expect([1, 2, 3, 5, 7, 9, 10].map(citadelStage)).toEqual([0, 0, 1, 2, 3, 4, 4]);
  });
  it("domínio define altura da torre", () => {
    expect(towerHeight(0)).toBeCloseTo(0.4);
    expect(towerHeight(100)).toBeCloseTo(3);
    expect(towerHeight(150)).toBeCloseTo(3);
  });
  it("arena por volume de questões", () => {
    expect([0, 30, 150, 500].map(arenaTier)).toEqual([0, 1, 2, 3]);
  });
  it("revisão frágil ou antiga gera névoa", () => {
    const now = new Date("2026-11-26T12:00:00Z");
    expect(overdueCount([
      { id: "a", name: "a", mastery: 80, reviewed: true, fragile: false, updatedAt: "2026-11-25T00:00:00Z" },
      { id: "b", name: "b", mastery: 40, reviewed: true, fragile: true },
      { id: "c", name: "c", mastery: 70, reviewed: true, fragile: false, updatedAt: "2026-11-10T00:00:00Z" },
      { id: "d", name: "d", mastery: 0, reviewed: false, fragile: false },
    ], now)).toBe(2);
  });
  it("farol acende com a prova próxima", () => {
    const now = new Date("2026-11-26T12:00:00Z");
    expect(lighthouseIntensity(null, now)).toBe(0);
    expect(lighthouseIntensity("2026-11-30", now)).toBe(1);
    expect(lighthouseIntensity("2026-01-01", now)).toBe(0);
    expect(lighthouseIntensity("2027-12-01", now)).toBeCloseTo(0.15);
  });
});
