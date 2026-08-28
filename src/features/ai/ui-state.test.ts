import { describe, expect, it } from "vitest";
import { intakeSubmitState, runStatusCopy, suggestionGroups } from "./ui-state";

describe("AI intake UI states", () => {
  it("disables empty intake with approved explanation", () => {
    expect(intakeSubmitState(" ", 0)).toEqual({ disabled: true, message: "เพิ่มข้อความหรือเลือกรูปอย่างน้อย 1 รายการ" });
  });
  it("describes durable queued work and groups suggestions", () => {
    expect(runStatusCopy("queued")).toContain("คุณออกจากหน้านี้ได้");
    expect(suggestionGroups([{ fieldKey: "price" }, { fieldKey: "description" }])).toEqual({ critical: [{ fieldKey: "price" }], content: [{ fieldKey: "description" }] });
  });
});
