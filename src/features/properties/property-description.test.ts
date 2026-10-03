import { describe, expect, it } from "vitest";
import { parsePropertyDescription } from "./property-description";

describe("parsePropertyDescription", () => {
  it("separates headings, paragraphs, and bullet points from an AI listing", () => {
    const sections = parsePropertyDescription(`เปิดทำเลดี\n\n📍 รายละเอียดและทำเล\n- เนื้อที่ 7 ไร่\n- ใกล้ถนน\n\n✨ จุดเด่น\n- วิวภูเขา`);
    expect(sections).toEqual([
      { paragraphs: ["เปิดทำเลดี"], bullets: [] },
      { heading: "📍 รายละเอียดและทำเล", paragraphs: [], bullets: ["เนื้อที่ 7 ไร่", "ใกล้ถนน"] },
      { heading: "✨ จุดเด่น", paragraphs: [], bullets: ["วิวภูเขา"] },
    ]);
  });

  it("keeps ordinary prose in readable paragraphs", () => {
    expect(parsePropertyDescription("ย่อหน้าแรก\nต่อเนื่อง\n\nย่อหน้าที่สอง")).toEqual([
      { paragraphs: ["ย่อหน้าแรก ต่อเนื่อง"], bullets: [] },
      { paragraphs: ["ย่อหน้าที่สอง"], bullets: [] },
    ]);
  });
});
