import { z } from "zod";

export const lineIntentSchema = z.object({
  kind: z.enum(["search", "detail", "agent_help", "appointment", "intake"]),
  query: z.string().max(120).nullable(),
  propertyId: z.uuid().nullable(),
  propertyType: z.enum(["land", "detached_house", "townhouse", "condominium", "commercial_building", "other"]).nullable(),
  listingType: z.enum(["sale", "rent"]).nullable(),
  maxPrice: z.number().nonnegative().nullable(),
  province: z.string().max(100).nullable(),
  district: z.string().max(100).nullable(),
}).strict();
export type LineIntent = z.infer<typeof lineIntentSchema>;
export function simpleIntent(text: string): LineIntent | null {
  const base = { query: null, propertyId: null, propertyType: null, listingType: null, maxPrice: null, province: null, district: null };
  if (/^(ทรัพย์ของฉัน|เว็บของฉัน|ช่วยเหลือ|help)$/i.test(text.trim())) return { ...base, kind: "agent_help" };
  if (/^(ลงทรัพย์|เพิ่มทรัพย์|ส่งทรัพย์|intake)/i.test(text.trim())) return { ...base, kind: "intake" };
  if (/นัด|appointment/i.test(text)) return { ...base, kind: "appointment" };
  const id = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  if (/รายละเอียด|detail/i.test(text)) return { ...base, kind: "detail", propertyId: id ?? null };
  if (/เชียงใหม่|เขาค้อ/.test(text) && /บ้าน|ที่ดิน/.test(text)) {
    const budget = text.match(/(?:ไม่เกิน|งบ)\s*([\d,.]+)\s*(ล้าน|บาท)?/);
    return {
      ...base, kind: "search",
      propertyType: /ที่ดิน/.test(text) ? "land" : "detached_house",
      province: /เชียงใหม่/.test(text) ? "เชียงใหม่" : null,
      district: /เขาค้อ/.test(text) ? "เขาค้อ" : null,
      maxPrice: budget ? Number(budget[1]!.replaceAll(",", "")) * (budget[2] === "ล้าน" ? 1000000 : 1) : null,
    };
  }
  return null;
}
