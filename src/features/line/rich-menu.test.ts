import { describe, expect, it } from "vitest";
import { DEVELOPMENT_RICH_MENU, buildRichMenu } from "./rich-menu";
import { lineMenuResponse } from "./menu-response";
import type { ConversationInput } from "./conversation";

describe("Development Rich Menu", () => {
  it("contains exactly the three approved buttons and covers the image", () => {
    expect(DEVELOPMENT_RICH_MENU.map(item => item.label)).toEqual(["ทรัพย์ของฉัน", "นัดหมาย", "เว็บของฉัน"]);
    const menu = buildRichMenu();
    expect(menu.areas).toHaveLength(3);
    expect(menu.areas.reduce((sum, area) => sum + area.bounds.width, 0)).toBe(2500);
    expect(menu.areas.map(area => area.action.data)).toEqual(["menu:properties", "menu:appointments", "menu:website"]);
  });
  it("resolves each verified Agent website independently", () => {
    const request = { event: { postback: "menu:website" }, context: { actor: { slug: "agent-one" } }, origin: "https://example.com" } as ConversationInput;
    expect(JSON.stringify(lineMenuResponse(request))).toContain("https://example.com/agents/agent-one");
    request.context.actor!.slug = "agent-two";
    expect(JSON.stringify(lineMenuResponse(request))).toContain("https://example.com/agents/agent-two");
    expect(JSON.stringify(lineMenuResponse(request))).not.toContain("agent-one");
  });
  it("requires identity linking before disclosing an Agent website", () => {
    const request = { event: { text: "เว็บของฉัน" }, context: { actor: null }, origin: "https://example.com" } as ConversationInput;
    expect(JSON.stringify(lineMenuResponse(request))).toContain("เชื่อมบัญชี");
    expect(JSON.stringify(lineMenuResponse(request))).not.toContain("/agents/");
  });
});
