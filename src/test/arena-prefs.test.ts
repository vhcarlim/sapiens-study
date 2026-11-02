import { describe, it, expect } from "vitest";
import { pickAngle } from "@/lib/arena-prefs";

describe("pickAngle", () => {
  it("avoids the last used automatic angle", () => {
    expect(pickAngle([], ["conceito central"])).toBe("caso prático");
  });
  it("rotates only within chosen styles", () => {
    expect(pickAngle(["lei", "caso"], ["Literalidade da lei"])).toBe("Caso prático");
    expect(pickAngle(["lei", "caso"], ["Caso prático"])).toBe("Literalidade da lei");
  });
  it("single style always returns it", () => {
    expect(pickAngle(["jurisprudencia"], ["Jurisprudência"])).toBe("Jurisprudência");
  });
});
