import { z } from "zod";
import { propertyDraftSchema,type PropertyDraftInput } from "../properties/schemas";
import { validateAiOutput } from "../ai/output-validator";
import type { LineMessage } from "./property-flex";

export const intakeSessionSchema=z.object({
  id:z.uuid(),tenant_id:z.uuid(),property_id:z.uuid(),state:z.enum(["collecting","review","confirmed","cancelled"]),
  source_text:z.string(),version:z.number(),extraction_count:z.number(),
  review_property_version:z.number().nullable().optional(),
  extracted:z.unknown().nullable().optional(),
  media:z.array(z.object({ id:z.uuid(),message_id:z.string(),object_path:z.string(),mime_type:z.string(),checksum_sha256:z.string() })).max(10),
});
export type IntakeSession=z.infer<typeof intakeSessionSchema>;
const names: Record<string,string>={ listing_type:"listingType",property_type:"propertyType",land_area_sqm:"landAreaSquareMetres",building_area_sqm:"buildingAreaSquareMetres",address_line:"addressLine" };
export function extractedDraft(output:unknown,session:IntakeSession) {
  const validated=validateAiOutput(output,new Set([session.id,...session.media.map(m=>m.id)]),{ maxContentCharacters:10000 });
  if(!validated.ok) throw new Error(`INTAKE_${validated.code}`);
  const values:Record<string,unknown>={ currency:"THB" };
  for(const suggestion of validated.suggestions) {
    if(suggestion.value===null) continue;
    const key=names[suggestion.fieldKey]??suggestion.fieldKey;
    values[key]=["price","landAreaSquareMetres","buildingAreaSquareMetres"].includes(key)?String(suggestion.value):suggestion.value;
  }
  return propertyDraftSchema.safeParse(values);
}
export function intakeSummary(session:IntakeSession,origin:string):LineMessage[] {
  const p:PropertyDraftInput=propertyDraftSchema.parse(session.extracted);
  const types:Record<string,string>={land:"ที่ดิน",detached_house:"บ้านเดี่ยว",townhouse:"ทาวน์เฮาส์",condominium:"คอนโด",commercial_building:"อาคารพาณิชย์",other:"อื่น ๆ"};
  const text=["สร้างแบบร่างแล้ว กรุณาตรวจข้อมูลก่อนเผยแพร่",p.title,
    `${p.listingType==="sale"?"ขาย":"เช่า"} ${types[p.propertyType]}`,
    `ราคา ${Number(p.price).toLocaleString("th-TH")} บาท`,
    `ทำเล ${p.subdistrict??""} ${p.district} ${p.province}`,
    p.landAreaSquareMetres?`พื้นที่ดิน ${p.landAreaSquareMetres} ตร.ม. (${Number(p.landAreaSquareMetres)/4} ตร.ว.)`:null,
    p.buildingAreaSquareMetres?`พื้นที่ใช้สอย ${p.buildingAreaSquareMetres} ตร.ม.`:null,
    p.bedrooms!==undefined?`${p.bedrooms} ห้องนอน / ${p.bathrooms} ห้องน้ำ`:null,
    `รูปภาพ ${session.media.length} รูป`,p.description.slice(0,1500),
    `ดูข้อมูลทั้งหมด: ${origin}/dashboard/properties/${session.property_id}/edit`,
  ].filter(Boolean).join("\n");
  return [{type:"text",text},{type:"flex",altText:"ตรวจแบบร่างก่อนเผยแพร่",contents:{type:"bubble",body:{type:"box",layout:"vertical",contents:[{type:"text",text:"ยืนยันข้อมูลแบบร่าง",weight:"bold"}]},footer:{type:"box",layout:"vertical",contents:[
    {type:"button",action:{type:"postback",label:"ยืนยันและเผยแพร่",data:`intake:confirm:${session.id}:${session.review_property_version}`}},
    {type:"button",action:{type:"uri",label:"แก้ไข",uri:`${origin}/dashboard/properties/${session.property_id}/edit`}},
    {type:"button",action:{type:"postback",label:"ยกเลิก",data:`intake:cancel:${session.id}:0`}},
  ]}}}];
}
