import { describe, expect, it } from "vitest";
import {
  AGENT_NAVIGATION,
  DESIGN_BREAKPOINTS,
  MEDIA_LIMIT,
  MIN_TOUCH_TARGET,
} from "./design-contract";

describe("Mesub UI contract", () => {
  it("locks approved responsive and navigation rules", () => {
    expect(DESIGN_BREAKPOINTS).toEqual({ mobileMax: 620, tabletMax: 950 });
    expect(MIN_TOUCH_TARGET).toBe(44);
    expect(MEDIA_LIMIT).toBe(20);
    expect(AGENT_NAVIGATION.map((item) => item.label)).toEqual([
      "ภาพรวม",
      "ทรัพย์ของฉัน",
      "ลูกค้าที่สนใจ",
      "โปรไฟล์ของฉัน",
    ]);
  });
});
