import { describe, expect, it } from "vitest";
import { reviewOutcome } from "@/lib/reviews";

describe("active review progression", () => {
  it("extends successful reviews from 1 to 7 to 30 days", () => {
    expect(reviewOutcome(70, 0)).toMatchObject({ days: 7, delta: 8, xp: 25 });
    expect(reviewOutcome(95, 1)).toMatchObject({ days: 30, stage: 2 });
  });
  it("shortens weak recall without removing studied time", () => {
    expect(reviewOutcome(60, 2)).toMatchObject({ days: 1, delta: -3, xp: 0 });
    expect(reviewOutcome(10, 0)).toMatchObject({ days: 1, delta: -5, stage: 0 });
  });
  it("caps the longest repetition cycle", () => {
    expect(reviewOutcome(100, 5)).toMatchObject({ days: 180, stage: 5 });
  });
});