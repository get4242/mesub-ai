import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAiGateway } from "../ai/provider/openai-gateway";
import type { AiProvider } from "../ai/provider/provider";
import type { ConversationInput } from "./conversation";
import type { LineMessage } from "./property-flex";
import { lineActorArgs,lineRpc } from "./conversation-contract";
import { downloadLineImage,lineImageMetadata } from "./intake-media";
import { extractedDraft,intakeSessionSchema,intakeSummary } from "./intake-model";

const reply=(text:string):LineMessage[]=>[{type:"text",text}];
export async function handleLineIntake(input:ConversationInput,dependencies:{provider?:AiProvider;request?:typeof fetch}={}):Promise<LineMessage[]|null> {
  const {event,context,admin,config,origin}=input;
  const text=event.text?.trim()??"";
  const start=/^(เพิ่มทรัพย์|ลงทรัพย์|ส่งทรัพย์|intake)/i.test(text);
  const decision=event.postback?.match(/^intake:(confirm|cancel):([0-9a-f-]{36}):(\d+)$/);
  if(!context.actor) return start||event.messageType==="image"||decision
    ?reply(`กรุณาเชื่อมบัญชี Agent ก่อนส่งทรัพย์: ${origin}/dashboard/profile`):null;
  const args=lineActorArgs(event,config);
  if(decision) {
    const result=await lineRpc(admin,"line_intake_decide_server",{...args,target_session:decision[2],target_decision:decision[1],target_version:Number(decision[3])}) as {outcome:string;propertyId?:string};
    if(["published","already_published","confirmed"].includes(result.outcome)) return reply(`ยืนยันและเผยแพร่แล้ว: ${origin}/properties/${result.propertyId}`);
    if(result.outcome==="cancelled") return reply("ยกเลิกการส่งทรัพย์แล้ว แบบร่างที่สร้างไว้ถูกเก็บเข้าคลัง");
    return reply(result.outcome==="quota_exceeded"?"ถึงขีดจำกัดประกาศของแพ็กเกจแล้ว แบบร่างยังอยู่ในเว็บ กรุณาจัดการประกาศก่อนเผยแพร่":"ข้อมูลทรัพย์เปลี่ยนแปลงแล้ว กรุณาตรวจและยืนยันเวอร์ชันล่าสุดในเว็บ");
  }
  if(event.postback) return null;
  const current=await lineRpc(admin,"line_intake_session_server",{...args,target_start:start||event.messageType==="image"});
  if(!current) return null;
  let session=intakeSessionSchema.parse(current);
  const scoped={...args,target_session:session.id};
  if(/^(ยกเลิก|cancel)$/i.test(text)) {
    await lineRpc(admin,"line_intake_decide_server",{...scoped,target_decision:"cancel",target_version:0});
    return reply("ยกเลิกการส่งทรัพย์แล้ว");
  }
  if(session.state==="review") return intakeSummary(session,origin);
  if(event.messageType==="image" && event.messageId) {
    if(session.media.some(m=>m.message_id===event.messageId)) return reply(`รับรูปแล้ว ${session.media.length} รูป ส่งรายละเอียดต่อได้ แล้วพิมพ์ “วิเคราะห์ทรัพย์” เมื่อครบ`);
    if(session.media.length>=Math.min(10,config.ai.limits.maxImages)) return reply("ครบจำนวนรูปที่รองรับแล้ว พิมพ์ “วิเคราะห์ทรัพย์” เพื่อสร้างร่าง");
    const image=await downloadLineImage(event.messageId,config.line.messagingAccessToken,dependencies.request);
    const metadata=lineImageMetadata(session,event.messageId,image);
    const storage=createAdminClient().storage.from("property-published");
    const uploaded=await storage.upload(metadata.object_path,image.bytes,{contentType:image.mimeType,upsert:true});
    if(uploaded.error) throw new Error("LINE_INTAKE_STORAGE_FAILED");
    session=intakeSessionSchema.parse(await lineRpc(admin,"line_intake_input_server",{...scoped,target_event:event.eventId,target_media:metadata}));
    return reply(`รับรูปแล้ว ${session.media.length} รูป ส่งรายละเอียดต่อได้ แล้วพิมพ์ “วิเคราะห์ทรัพย์” เมื่อครบ`);
  }
  if(!/^(วิเคราะห์ทรัพย์|สร้างร่าง|เสร็จแล้ว)$/i.test(text)) {
    const description=text.replace(/^(เพิ่มทรัพย์|ลงทรัพย์|ส่งทรัพย์|intake)\s*/i,"");
    if(description) await lineRpc(admin,"line_intake_input_server",{...scoped,target_event:event.eventId,target_text:description});
    return reply("รับข้อมูลแล้ว ส่งรูปได้หลายรูป พร้อมประเภททรัพย์ ราคา จังหวัด/อำเภอ พื้นที่ และจำนวนห้อง จากนั้นพิมพ์ “วิเคราะห์ทรัพย์” หรือ “ยกเลิก”");
  }
  if(!session.source_text && !session.media.length) return reply("กรุณาส่งรายละเอียดหรือรูปก่อนวิเคราะห์ทรัพย์");
  session=intakeSessionSchema.parse(await lineRpc(admin,"line_intake_extract_claim_server",{...scoped,target_event:event.eventId,target_daily_limit:config.ai.limits.maxRunsPerTenantPerDay}));
  if(session.state==="review") return intakeSummary(session,origin);
  try {
    const images:Array<{sourceId:string;dataUrl:string}>=[];
    const storage=createAdminClient().storage.from("property-published");
    for(const media of session.media) {
      const signed=await storage.createSignedUrl(media.object_path,120);
      if(signed.error || !signed.data) throw new Error("LINE_INTAKE_STORAGE_FAILED");
      images.push({sourceId:media.id,dataUrl:signed.data.signedUrl});
    }
    const result=await (dependencies.provider??createOpenAiGateway()).generate({
      task:images.length?"vision":"extraction",model:images.length?config.ai.models.vision:config.ai.models.extraction,
      timeoutMs:Math.min(config.ai.limits.timeoutMs,30000),images,
      snapshot:{schemaVersion:1,agentText:session.source_text,textSourceId:session.id,media:session.media.map(m=>({id:m.id,checksumSha256:m.checksum_sha256}))},
    });
    const draft=extractedDraft(result.output,session);
    const finished=await lineRpc(admin,"line_intake_draft_server",{...scoped,target_event:event.eventId,target_draft:draft.success?draft.data:null});
    if(!draft.success) return reply("ข้อมูลยังไม่ครบสำหรับสร้างร่าง กรุณาเพิ่มประเภทประกาศ/ทรัพย์ ราคา จังหวัด อำเภอ พื้นที่ และจำนวนห้องสำหรับบ้านหรือคอนโด แล้วพิมพ์ “วิเคราะห์ทรัพย์” อีกครั้ง ระบบจะไม่เดาค่าที่ขาด");
    return intakeSummary(intakeSessionSchema.parse(finished),origin);
  } catch(error) {
    await lineRpc(admin,"line_intake_draft_server",{...scoped,target_event:event.eventId,target_draft:null});
    throw error;
  }
}
