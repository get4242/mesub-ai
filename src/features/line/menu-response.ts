import type { ConversationInput } from "./conversation";
import type { LineMessage } from "./property-flex";

export function lineMenuResponse({ event, context, origin }: ConversationInput): LineMessage[] | null {
  const command = event.postback ?? ({ "ทรัพย์ของฉัน": "menu:properties", "นัดหมาย": "menu:appointments", "เว็บของฉัน": "menu:website" } as Record<string, string>)[event.text?.trim() ?? ""];
  if (!command || !["menu:properties", "menu:appointments", "menu:website"].includes(command)) return null;
  const actor = context.actor;
  const text = !actor
    ? `กรุณาเชื่อมบัญชี LINE กับ Agent ก่อนใช้เมนูนี้: ${origin}/dashboard/profile`
    : command === "menu:website"
      ? `เว็บของคุณ: ${origin}/agents/${encodeURIComponent(actor.slug)}`
      : command === "menu:appointments"
        ? `นัดหมายของคุณ: ${origin}/dashboard/appointments\nพิมพ์ “ยืนยันนัด [รหัสนัด]”, “ยกเลิกนัด [รหัสนัด]” หรือ “เลื่อนนัด [รหัสนัด] พรุ่งนี้บ่ายสอง”`
        : `ทรัพย์ของคุณ: ${origin}/dashboard/properties\nพิมพ์ “เพิ่มทรัพย์” แล้วส่งรูปและรายละเอียดเพื่อสร้างร่าง`;
  return [{ type: "text", text }];
}
