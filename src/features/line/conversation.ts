import "server-only";
import { z } from "zod";
import type { WorkerAdmin } from "../workers/runtime";
import { createLineIntentParser } from "./intent-provider";
import { lineIntentSchema, type LineIntent } from "./intent";
import { propertyFlex, linePropertySchema, type LineMessage } from "./property-flex";
import { deliverConversation } from "./conversation-delivery";
import { handleLineIntake } from "./intake";
import { handleLineAppointment } from "./appointments";
import { lineMenuResponse } from "./menu-response";
import { conversationEventSchema, conversationContextSchema, lineActorArgs, lineRpc, linePublicOrigin, type ConversationEvent, type ConversationContext, type LineRuntimeConfig } from "./conversation-contract";

export type ConversationInput = { event: ConversationEvent; context: ConversationContext; admin: WorkerAdmin; config: LineRuntimeConfig; origin: string };
export type ConversationExtension = (input: ConversationInput) => Promise<LineMessage[] | null>;
const message = (text: string): LineMessage[] => [{ type: "text",text }];

async function answer(input: ConversationInput, parse: (text: string) => Promise<LineIntent>) {
  const { event,context,admin,config,origin } = input;
  const text = event.text ?? "";
  const detail = event.postback?.match(/^detail:([0-9a-f-]{36})$/i)?.[1];
  const intent = detail
    ? lineIntentSchema.parse({ kind: "detail",propertyId: detail,query: null,propertyType: null,listingType: null,maxPrice: null,province: null,district: null })
    : await parse(text);
  if (intent.kind === "search" || intent.kind === "detail") {
    let propertyId = intent.kind === "detail" ? intent.propertyId : null;
    // A model cannot select an ID the user did not supply.
    if (propertyId && !text.includes(propertyId) && detail !== propertyId) propertyId = null;
    if (intent.kind === "detail" && !propertyId) {
      if (context.propertyIds.length !== 1) return message("กรุณาเลือกปุ่ม “รายละเอียดในแชต” บนการ์ดทรัพย์ที่ต้องการ หรือส่งรหัสทรัพย์ เพื่อให้แสดงข้อมูลได้ถูกหลังครับ");
      propertyId = context.propertyIds[0]!;
    }
    const properties = z.array(linePropertySchema).parse(await lineRpc(admin,"line_public_properties_server",{ target_filters: intent,target_property_id: propertyId }));
    await lineRpc(admin,"line_remember_properties_server",{ ...lineActorArgs(event,config),target_property_ids: properties.map(p=>p.id) });
    if (!properties.length) return message("ไม่พบทรัพย์ที่เผยแพร่ตรงตามข้อมูลนี้ ลองระบุทำเล ประเภททรัพย์ หรืองบประมาณใหม่ได้ครับ");
    const cards = propertyFlex(properties,origin);
    return intent.kind === "detail" && properties[0]?.description
      ? [cards,...message(properties[0].description.slice(0,4500))]
      : [cards];
  }
  if (intent.kind === "agent_help") {
    return message(context.actor
      ? `ทรัพย์ของฉัน: ${origin}/dashboard/properties\nเว็บของฉัน: ${origin}/agents/${encodeURIComponent(context.actor.slug)}\nพิมพ์ “เพิ่มทรัพย์” เพื่อส่งรูปและรายละเอียด หรือ “นัดหมาย” เพื่อจัดการนัด`
      : `ค้นหาทรัพย์ได้โดยพิมพ์ประเภท ทำเล และงบประมาณ\nสำหรับ Agent กรุณาเข้าสู่ระบบและเชื่อม LINE: ${origin}/dashboard/profile`);
  }
  if (intent.kind === "intake") return message(`เริ่มส่งทรัพย์และตรวจร่างได้ที่ ${origin}/dashboard/properties/new`);
  if (intent.kind === "appointment") return message("กรุณาเลือกทรัพย์จากผลค้นหาแล้วกด “นัดชมทรัพย์” เพื่อระบุวันและเวลาครับ");
  return message("พิมพ์ประเภททรัพย์ ทำเล และงบประมาณ หรือพิมพ์ “ช่วยเหลือ” ครับ");
}

export async function processLineConversation(payload: unknown,admin: WorkerAdmin,config: LineRuntimeConfig,dependencies: {
  parseIntent?: (text: string)=>Promise<LineIntent>;
  send?: (event: ConversationEvent,messages: unknown[])=>Promise<void>;
  extension?: ConversationExtension;
} = {}) {
  const parsed = conversationEventSchema.safeParse(payload);
  if (!parsed.success) return false;
  const event = parsed.data;
  if (event.type !== "message" && event.type !== "postback") return false;
  const send = dependencies.send ?? ((e,m)=>deliverConversation(e,config,m));
  if (event.responseMessages?.length) { await send(event,event.responseMessages); return true; }
  const context = conversationContextSchema.parse(await lineRpc(admin,"line_context_server",lineActorArgs(event,config)));
  const input = { event,context,admin,config,origin: linePublicOrigin() };
  let messages = dependencies.extension
    ? await dependencies.extension(input)
    : lineMenuResponse(input) ?? (await handleLineAppointment(input)) ?? (await handleLineIntake(input));
  if (!messages && event.messageType !== "text" && !event.postback?.startsWith("detail:")) return false;
  if (!messages) {
    const parse = dependencies.parseIntent ?? createLineIntentParser(config.openAiApiKey,config.ai.models.lineConversation,config.ai.limits.timeoutMs);
    messages = await answer(input,parse);
  }
  await lineRpc(admin,"line_cache_response_server",{ target_event_id: event.eventId,target_messages: messages });
  await send(event,messages);
  return true;
}
