import { describe, expect, it } from "vitest";
import { propertyListState, propertyMutationMessage, publicationMessage } from "./dashboard-model";

describe("property dashboard state", () => {
  it("provides the approved empty-state copy and CTA", () => {
    expect(propertyListState([])).toEqual({ empty: true, title: "เพิ่มทรัพย์รายการแรก", actionLabel: "เพิ่มทรัพย์" });
  });

  it("keeps a blocked fourth draft and explains quota recovery", () => {
    expect(publicationMessage("QUOTA_EXCEEDED")).toMatch(/ร่าง.*ยังอยู่|ยังเก็บ/);
  });

  it("provides a safe recovery message for stale edits", () => {
    expect(propertyMutationMessage("VERSION_CONFLICT")).toMatch(/โหลดข้อมูลอีกครั้ง/);
  });
});
