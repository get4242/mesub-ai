import { z } from "zod";
export const linePropertySchema = z.object({
  id: z.uuid(), slug: z.string(), title: z.string(), property_type: z.string(),
  price: z.union([z.string().regex(/^\d+(?:\.\d+)?$/), z.number().nonnegative()]), province: z.string(), district: z.string(),
  description: z.string().optional(), media_id: z.uuid().nullable().optional(),
});
export type LineProperty = z.infer<typeof linePropertySchema>;
export type LineMessage = { type: "text"; text: string } | { type: "flex"; altText: string; contents: Record<string, unknown> };
const labels: Record<string, string> = { land: "ที่ดิน", detached_house: "บ้านเดี่ยว", townhouse: "ทาวน์เฮาส์", condominium: "คอนโด", commercial_building: "อาคารพาณิชย์", other: "อื่น ๆ" };
export function propertyFlex(properties: LineProperty[], origin: string): LineMessage {
  const contents = properties.slice(0, 10).map((p) => {
    const url = new URL(`/properties/${encodeURIComponent(p.slug)}`, origin).href;
    return {
      type: "bubble",
      ...(p.media_id ? { hero: { type: "image", url: new URL(`/api/public-property-media/${p.media_id}`, origin).href, size: "full", aspectRatio: "20:13", aspectMode: "cover" } } : {}),
      body: { type: "box", layout: "vertical", spacing: "sm", contents: [
        { type: "text", text: p.title.slice(0, 200), weight: "bold", wrap: true },
        { type: "text", text: labels[p.property_type] ?? p.property_type, size: "sm" },
        { type: "text", text: `${Number(p.price).toLocaleString("th-TH")} บาท`, weight: "bold" },
        { type: "text", text: `${p.district} ${p.province}`, wrap: true, size: "sm" },
      ] },
      footer: { type: "box", layout: "vertical", contents: [
        { type: "button", action: { type: "postback", label: "รายละเอียดในแชต", data: `detail:${p.id}` } },
        { type: "button", action: { type: "uri", label: "ดูรายละเอียด", uri: url } },
        { type: "button", action: { type: "uri", label: "แชร์", uri: `https://line.me/R/share?text=${encodeURIComponent(p.title + " " + url)}` } },
        { type: "button", action: { type: "postback", label: "นัดชมทรัพย์", data: `appointment:${p.id}`, displayText: `นัดชม ${p.title.slice(0, 100)}` } },
      ] },
    };
  });
  return { type: "flex", altText: "ผลค้นหาทรัพย์จาก Mesub AI", contents: { type: "carousel", contents } };
}
