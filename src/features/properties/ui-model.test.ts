import { describe, expect, it } from "vitest";
import { propertyUiActions, quotaCopy } from "./ui-model";

describe("property UI model", () => {
  it("shows only lifecycle-supported actions", () => {
    expect(propertyUiActions("draft", false)).toEqual(["edit", "ai"]);
    expect(propertyUiActions("draft", true)).toEqual([
      "edit",
      "ai",
      "publish",
    ]);
    expect(propertyUiActions("pending_confirmation", false)).toEqual([
      "edit",
      "ai",
    ]);
    expect(propertyUiActions("published", true)).toEqual(["edit", "view"]);
    expect(propertyUiActions("archived", true)).toEqual([]);
  });

  it("uses supplied canonical quota values", () => {
    expect(quotaCopy(2, 3)).toEqual({
      label: "เผยแพร่แล้ว 2 จาก 3",
      remaining: "เหลืออีก 1 รายการ",
    });
  });
});
