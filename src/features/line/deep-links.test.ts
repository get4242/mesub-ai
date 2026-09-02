import { describe, expect, it } from "vitest";
import { buildLinePermanentLink, isAllowedLineReturnPath } from "./deep-links";

describe("LINE permanent links", () => {
  it("preserves only allowlisted Mesub routes", () => {
    expect(buildLinePermanentLink("123-dev", "/dashboard/properties/new")).toBe(
      "https://miniapp.line.me/123-dev/dashboard/properties/new",
    );
    expect(isAllowedLineReturnPath("/dashboard/properties/abc/ai")).toBe(true);
  });
  it("rejects open redirects and unknown routes", () => {
    expect(() =>
      buildLinePermanentLink("123-dev", "https://evil.example"),
    ).toThrow("INVALID_LINE_PATH");
    expect(isAllowedLineReturnPath("//evil.example")).toBe(false);
  });
});
