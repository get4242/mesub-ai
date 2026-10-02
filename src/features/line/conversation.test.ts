import { describe,expect,it,vi } from "vitest";
import { processLineConversation } from "./conversation";
import { simpleIntent } from "./intent";
import { propertyFlex } from "./property-flex";
import { lineReplyRetryKey,deliverConversation } from "./conversation-delivery";
import { encryptLineDestination } from "./destination-crypto";
import type { LineRuntimeConfig } from "./conversation-contract";

const id = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const config = { line: { providerId: "provider",environment: "development",encryptionKey: "a".repeat(32),messagingAccessToken: "test-token" } } as LineRuntimeConfig;
const event = { eventId: "event-1",type: "message",subjectHash: "a".repeat(64),destination: "encrypted",messageType: "text",text: "มีบ้านเชียงใหม่ไม่เกิน 4 ล้าน" };
const property = { id,slug: "house",title: "บ้านจริง",property_type: "detached_house",price: "3900000",province: "เชียงใหม่",district: "เมือง",description: "รายละเอียดจากฐานข้อมูล",media_id: otherId };
function repository(properties = [property],ids: string[] = []) {
  const rpc = vi.fn(async (name: string) => ({ error: null,data:
    name === "line_context_server" ? { actor: null,propertyIds: ids } :
    name === "line_public_properties_server" ? properties : null,
  }));
  return { rpc };
}
describe("LINE published-property conversation",()=>{
  it("supports the requested Thai examples and decimal budgets",()=>{
    expect(simpleIntent(event.text)).toMatchObject({ kind: "search",province: "เชียงใหม่",maxPrice: 4000000 });
    expect(simpleIntent("มีที่ดินเขาค้อไหม")).toMatchObject({ kind: "search",propertyType: "land",district: "เขาค้อ" });
    expect(simpleIntent("มีบ้านเชียงใหม่ไม่เกิน 3.5 ล้าน")).toMatchObject({ maxPrice: 3500000 });
    expect(simpleIntent("ขอรายละเอียดทรัพย์นี้")).toMatchObject({ kind: "detail",propertyId: null });
  });
  it("queries the published RPC and caches actual database facts before delivery",async()=>{
    const admin=repository(); const send=vi.fn();
    await processLineConversation(event,admin,config,{ parseIntent: async()=>simpleIntent(event.text)!,send });
    expect(admin.rpc).toHaveBeenCalledWith("line_public_properties_server",expect.objectContaining({ target_property_id: null,target_filters: expect.objectContaining({ maxPrice: 4000000 }) }));
    expect(JSON.stringify(send.mock.calls)).toContain("บ้านจริง");
    expect(JSON.stringify(send.mock.calls)).toContain("3,900,000");
    expect(admin.rpc.mock.calls.findIndex(c=>c[0]==="line_cache_response_server")).toBeGreaterThan(0);
  });
  it("does not invent a property when no published result exists",async()=>{
    const admin=repository([]);const send=vi.fn();
    await processLineConversation(event,admin,config,{ parseIntent: async()=>simpleIntent(event.text)!,send });
    expect(send.mock.calls[0]![1]).toEqual([{ type: "text",text: expect.stringContaining("ไม่พบทรัพย์") }]);
  });
  it("asks for selection when a contextual detail request is ambiguous",async()=>{
    const admin=repository([property],[id,otherId]);const send=vi.fn();
    await processLineConversation({ ...event,text: "ขอรายละเอียดทรัพย์นี้" },admin,config,{ parseIntent: async()=>simpleIntent("ขอรายละเอียดทรัพย์นี้")!,send });
    expect(admin.rpc).not.toHaveBeenCalledWith("line_public_properties_server",expect.anything());
    expect(JSON.stringify(send.mock.calls)).toContain("กรุณาเลือก");
  });
  it("re-fetches the selected property instead of serving stale cached facts",async()=>{
    const admin=repository([],[id]);const send=vi.fn();
    await processLineConversation({ ...event,text: "ขอรายละเอียดทรัพย์นี้" },admin,config,{ parseIntent: async()=>simpleIntent("ขอรายละเอียดทรัพย์นี้")!,send });
    expect(admin.rpc).toHaveBeenCalledWith("line_public_properties_server",expect.objectContaining({ target_property_id: id }));
    expect(JSON.stringify(send.mock.calls)).toContain("ไม่พบทรัพย์");
  });
  it("ignores events without protected direct-message identity",async()=>{
    const admin=repository();const send=vi.fn();
    expect(await processLineConversation({ type: "message",text: "hello" },admin,config,{ send })).toBe(false);
    expect(admin.rpc).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();
  });
  it("reuses a cached response on retry without repeating AI or queries",async()=>{
    const admin=repository();const send=vi.fn();const parseIntent=vi.fn();
    const responseMessages=[{ type: "text",text: "cached" }];
    await processLineConversation({ ...event,responseMessages },admin,config,{ send,parseIntent });
    expect(admin.rpc).not.toHaveBeenCalled();expect(parseIntent).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(expect.anything(),responseMessages);
  });
  it("builds image, price, location, detail, share and appointment actions from one record",()=>{
    const result=JSON.stringify(propertyFlex([property],"https://example.com"));
    for(const value of ["api/public-property-media/", "3,900,000", "เชียงใหม่", "https://example.com/properties/house", "https://line.me/R/share", `appointment:${id}`,`detail:${id}`]) expect(result).toContain(value);
  });
  it("has stable retry keys and accepts only a confirmed duplicate delivery",async()=>{
    expect(lineReplyRetryKey("e","production")).toBe(lineReplyRetryKey("e","production"));
    expect(lineReplyRetryKey("e","production")).not.toBe(lineReplyRetryKey("e","development"));
    const protectedEvent={ ...event,destination: encryptLineDestination("Utest",config.line.encryptionKey) };
    await expect(deliverConversation(protectedEvent,config,[{ type: "text",text: "hello" }],vi.fn(async()=>new Response(null,{ status: 409,headers: { "x-line-accepted-request-id": "receipt" } })))).resolves.toBeUndefined();
    await expect(deliverConversation(protectedEvent,config,[{ type: "text",text: "hello" }],vi.fn(async()=>new Response(null,{ status: 409 })))).rejects.toThrow("LINE_CONVERSATION_DELIVERY_FAILED");
  });
});
