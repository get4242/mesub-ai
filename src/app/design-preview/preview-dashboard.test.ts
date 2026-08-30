import { describe, expect, it } from "vitest";

import {
  createPropertyActions,
  createPropertySections,
  dashboardNavigation,
  designPreviewSurfaces,
  propertyActions,
} from "./preview-dashboard";

describe("Design Preview dashboard navigation", () => {
  it("keeps the approved four simple dashboard destinations", () => {
    expect(dashboardNavigation.map((item) => item.label)).toEqual([
      "ภาพรวม",
      "ทรัพย์ของฉัน",
      "ลูกค้าที่สนใจ",
      "โปรไฟล์ของฉัน",
    ]);
  });
});

describe("Design Preview property actions", () => {
  it("shows only actions supported by each current property state", () => {
    expect(propertyActions("draft").map((action) => action.label)).toEqual([
      "แก้ไข",
      "ให้ AI ช่วย",
    ]);
    expect(propertyActions("ai").map((action) => action.label)).toEqual([
      "แก้ไข",
      "ตรวจคำแนะนำ",
    ]);
    expect(propertyActions("confirmed").map((action) => action.label)).toEqual([
      "แก้ไข",
      "เผยแพร่",
    ]);
    expect(propertyActions("published").map((action) => action.label)).toEqual([
      "แก้ไข",
      "ดูประกาศ",
    ]);
  });
});

describe("Design Preview create-property flow", () => {
  it("orders the form from basic information through property images", () => {
    expect(createPropertySections).toEqual([
      "ข้อมูลพื้นฐานของทรัพย์",
      "ราคาและทำเล",
      "รายละเอียดทรัพย์",
      "รูปภาพทรัพย์",
    ]);
  });

  it("ends with the approved AI-first and draft actions", () => {
    expect(createPropertyActions).toEqual([
      "บันทึกและให้ AI ช่วยจัดข้อมูล",
      "บันทึกเป็นแบบร่าง",
    ]);
  });
});

describe("Mesub AI Design Preview system", () => {
  it("covers every approved public and agent surface", () => {
    expect(designPreviewSurfaces).toEqual([
      "public-landing",
      "property-search",
      "property-detail",
      "agent-dashboard",
      "property-management",
      "property-editor",
      "ai-assisted-intake",
      "leads",
      "agent-profile",
    ]);
  });
});
