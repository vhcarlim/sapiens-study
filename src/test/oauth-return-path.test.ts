import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "@/lib/oauth-return-path";
describe("OAuth return path", () => {
  it("preserves the consent authorization and fragment", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc#review")).toBe("/.lovable/oauth/consent?authorization_id=abc#review");
  });
  it.each(["https://outside.invalid", "//outside.invalid", "/\\outside.invalid/", "/\ninvalid", null])("rejects external or malformed targets: %s", (value) => {
    expect(oauthReturnPath(value)).toBe("/");
  });
});