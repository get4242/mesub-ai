import { describe,expect,it,vi } from "vitest";
import { downloadLineImage } from "./intake-media";
import { extractedDraft,intakeSummary,type IntakeSession } from "./intake-model";
import { handleLineIntake } from "./intake";
import type { ConversationInput } from "./conversation";

const id="00000000-0000-4000-8000-000000000001";
const session:IntakeSession={id,tenant_id:id,property_id:id,state:"collecting",source_text:"ขายที่ดินเชียงใหม่ 50 ตารางวา ราคา 1 ล้าน",version:1,extraction_count:0,media:[]};
const draft={listingType:"sale",propertyType:"land",title:"ที่ดินเชียงใหม่",description:"ที่ดินจากข้อมูล Agent",province:"เชียงใหม่",district:"เมือง",price:"1000000",currency:"THB",landAreaSquareMetres:"200"};
describe("LINE intake safety",()=>{
  it("rejects unsupported image hosts via message IDs before any download",async()=>{
    const request=vi.fn();
    await expect(downloadLineImage("https://evil.test/file","token",request)).rejects.toThrow("LINE_IMAGE_ID_INVALID");
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects oversized responses and non-image MIME types",async()=>{
    await expect(downloadLineImage("123","token",vi.fn(async()=>new Response("x",{headers:{"content-type":"image/png","content-length":"10485761"}})))).rejects.toThrow("LINE_IMAGE_INVALID");
    await expect(downloadLineImage("123","token",vi.fn(async()=>new Response("x",{headers:{"content-type":"text/html"}})))).rejects.toThrow("LINE_IMAGE_INVALID");
  });
  it("does not fill missing critical facts with invented defaults",()=>{
    expect(extractedDraft({schemaVersion:1,suggestions:[]},session).success).toBe(false);
  });
  it("rejects critical suggestions attributed to unknown evidence",()=>{
    expect(()=>extractedDraft({schemaVersion:1,suggestions:[{fieldKey:"price",value:1000000,confidence:1,confidenceUnknown:false,sourceIds:["another-tenant"]}]},session)).toThrow("SOURCE_REQUIRED");
  });
  it("builds explicit confirm, edit and cancel actions tied to the draft version",()=>{
    const result=JSON.stringify(intakeSummary({...session,state:"review",extracted:draft,review_property_version:4},"https://example.com"));
    expect(result).toContain(`intake:confirm:${id}:4`);
    expect(result).toContain(`intake:cancel:${id}:0`);
    expect(result).toContain(`/dashboard/properties/${id}/edit`);
    expect(result).toContain("ยืนยันและเผยแพร่");
  });
  it("requires an existing linked Agent before accepting images",async()=>{
    const rpc=vi.fn();
    const input={event:{messageType:"image"},context:{actor:null,propertyIds:[]},admin:{rpc},origin:"https://example.com"} as unknown as ConversationInput;
    expect(JSON.stringify(await handleLineIntake(input))).toContain("เชื่อมบัญชี Agent");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not accept an ordinary text message as publication confirmation",async()=>{
    const rpc=vi.fn(async()=>({data:{...session,state:"review",extracted:draft,review_property_version:4},error:null}));
    const input={event:{text:"ยืนยัน",subjectHash:"a".repeat(64)},context:{actor:{userId:id,tenantId:id,agentId:id,slug:"agent"},propertyIds:[]},admin:{rpc},config:{line:{providerId:"p",environment:"development"}},origin:"https://example.com"} as unknown as ConversationInput;
    await handleLineIntake(input);
    expect(rpc).not.toHaveBeenCalledWith("line_intake_decide_server",expect.anything());
  });
});
