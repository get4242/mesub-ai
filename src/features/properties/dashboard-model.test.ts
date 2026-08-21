import { describe, expect, it } from "vitest";
import { propertyListState, propertyMutationMessage } from "./dashboard-model";

describe("property dashboard state", () => {
  it("provides the approved empty-state copy and CTA", () => {
    expect(propertyListState([])).toEqual({ empty: true, title: "เพิ่มทรัพย์รายการแรก", actionLabel: "เพิ่มทรัพย์" });
  });

  it("provides a safe recovery message for stale edits", () => {
    expect(propertyMutationMessage("VERSION_CONFLICT")).toMatch(/โหลดข้อมูลอีกครั้ง/);
  });
});
