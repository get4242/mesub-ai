import "server-only";
import { z } from "zod";
import type { ConversationInput } from "./conversation";
import { lineActorArgs, lineRpc } from "./conversation-contract";
import type { LineMessage } from "./property-flex";
import { appointmentContact, parseAppointmentTime } from "./appointment-time";
import { bangkokDateTime } from "../appointments/domain";

const proposalSchema = z.object({ token: z.uuid(), propertyId: z.uuid(), startsAt: z.string(), endsAt: z.string(), customerName: z.string(), customerPhone: z.string() });
const resultSchema = z.object({ id: z.uuid(), starts_at: z.string(), status: z.enum(["requested", "confirmed", "cancelled"]) });
const reply = (text: string): LineMessage[] => [{ type: "text", text }];
const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export async function handleLineAppointment(input: ConversationInput): Promise<LineMessage[] | null> {
  const { event, context, admin, config, origin } = input;
  const text = event.text?.trim() ?? "";
  const postback = event.postback ?? "";
  const args = lineActorArgs(event, config);
  if (!/นัด|appointment/i.test(text) && !postback.startsWith("appointment:")) return null;
  if (text === "นัดหมาย" && context.actor) return reply(`ปฏิทินนัดหมายของคุณ: ${origin}/dashboard/appointments\nยืนยันนัด / ยกเลิกนัด ตามด้วยรหัสนัด หรือ “เลื่อนนัด [รหัสนัด] พรุ่งนี้บ่ายสอง”`);
  try {
    const confirm = postback.match(/^appointment:confirm:([0-9a-f-]{36})$/i)?.[1];
    if (confirm && z.uuid().safeParse(confirm).success) {
      const result = resultSchema.parse(await lineRpc(admin, "line_appointment_confirm_server", { ...args, target_token: confirm }));
      return reply(`ส่งคำขอนัดแล้ว รอ Agent ยืนยัน\n${bangkokDateTime(result.starts_at)}\nรหัสนัด: ${result.id}\nเลื่อนหรือยกเลิกได้โดยพิมพ์ “เลื่อนนัด” หรือ “ยกเลิกนัด” ตามด้วยรหัสนัด`);
    }
    const action = /^ยกเลิกนัด/.test(text) ? "cancel" : /^เลื่อนนัด/.test(text) ? "reschedule" : /^ยืนยันนัด/.test(text) ? "confirm" : null;
    if (action) {
      const id = text.match(uuid)?.[0];
      if (!id) return reply("กรุณาระบุรหัสนัดจากข้อความยืนยันนัดด้วยครับ");
      const time = action === "reschedule" ? parseAppointmentTime(text) : null;
      if (action === "reschedule" && !time) return reply("กรุณาระบุวันและเวลาใหม่ เช่น เลื่อนนัด [รหัสนัด] พรุ่งนี้บ่ายสอง");
      const result = resultSchema.parse(await lineRpc(admin, "line_appointment_change_server", {
        ...args, target_id: id, target_action: action, target_start: time?.startsAt ?? null, target_end: time?.endsAt ?? null,
      }));
      return reply(`${result.status === "cancelled" ? "ยกเลิกนัดแล้ว" : result.status === "confirmed" ? "ยืนยันนัดแล้ว" : "เลื่อนนัดแล้ว รอ Agent ยืนยันเวลาใหม่"}\n${bangkokDateTime(result.starts_at)}\nรหัสนัด: ${result.id}`);
    }
    const buttonId = postback.match(/^appointment:([0-9a-f-]{36})$/i)?.[1];
    const propertyId = buttonId ?? text.match(uuid)?.[0] ?? (context.propertyIds.length === 1 ? context.propertyIds[0] : null);
    if (!propertyId || !z.uuid().safeParse(propertyId).success) return reply("กรุณาเลือกปุ่มนัดชมทรัพย์บนการ์ดทรัพย์ที่ต้องการก่อนครับ");
    if (buttonId) {
      await lineRpc(admin, "line_remember_properties_server", { ...args, target_property_ids: [propertyId] });
      return reply("กรุณาส่งวัน เวลา ชื่อ และเบอร์โทร เช่น “นัดพรุ่งนี้บ่ายสอง ชื่อ สมชาย โทร 0812345678”\nนัดใช้เวลา 1 ชั่วโมง คุณจะได้ตรวจข้อมูลและกดยืนยันก่อนส่งข้อมูลติดต่อให้ Agent");
    }
    const time = parseAppointmentTime(text);
    const contact = appointmentContact(text);
    if (!time || !contact) return reply("กรุณาส่งข้อมูลครบในข้อความเดียว เช่น “นัดพรุ่งนี้บ่ายสอง ชื่อ สมชาย โทร 0812345678” หรือระบุวันที่ YYYY-MM-DD เวลา HH:mm (เวลาไทย)");
    const proposal = proposalSchema.parse(await lineRpc(admin, "line_appointment_proposal_server", {
      ...args, target_proposal: { propertyId, ...time, ...contact },
    }));
    return [{ type: "flex", altText: "ตรวจสอบคำขอนัดชมทรัพย์ก่อนยืนยัน", contents: {
      type: "bubble", body: { type: "box", layout: "vertical", contents: [
        { type: "text", text: "ตรวจสอบนัดชมทรัพย์", weight: "bold", size: "lg" },
        { type: "text", text: `${bangkokDateTime(proposal.startsAt)} (1 ชั่วโมง)\n${proposal.customerName}\n${proposal.customerPhone}`, wrap: true },
        { type: "text", text: "เมื่อกดยืนยัน คุณยินยอมให้ส่งชื่อและเบอร์โทรแก่ Agent เจ้าของทรัพย์เพื่อติดต่อนัดหมาย หากต้องการแก้ไขให้ส่งข้อความใหม่", wrap: true, size: "sm" },
      ] }, footer: { type: "box", layout: "vertical", contents: [
        { type: "button", action: { type: "postback", label: "ยืนยันส่งคำขอนัด", data: `appointment:confirm:${proposal.token}` } },
      ] },
    } }];
  } catch {
    return reply("ดำเนินการนัดไม่สำเร็จ อาจมีนัดซ้อน ข้อมูลหมดอายุ หรือไม่มีสิทธิ์ กรุณาตรวจข้อมูลและเลือกเวลาใหม่ หรือติดต่อ Agent");
  }
}
