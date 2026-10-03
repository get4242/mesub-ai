import { describe, expect, it } from "vitest";
import { formatLandArea } from "./land-area-display";

describe("formatLandArea", () => {
  it("converts stored square metres into Thai rai, ngan and square wah", () => {
    expect(formatLandArea(37_048)).toBe("23 ไร่ 62 ตร.ว.");
    expect(formatLandArea(44_400)).toBe("27 ไร่ 3 งาน");
  });
});
