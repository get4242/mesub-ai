import { z } from "zod";

export const appointmentInputSchema=z.object({
  propertyId:z.uuid(),leadId:z.uuid().optional(),customerName:z.string().trim().min(1).max(120),
  customerPhone:z.string().trim().min(6).max(40).optional(),customerEmail:z.email().optional(),
  startsAt:z.iso.datetime({offset:true}),endsAt:z.iso.datetime({offset:true}),notes:z.string().max(2000).default(""),
  idempotencyKey:z.string().min(8).max(200),
}).strict().superRefine((v,c)=>{
  if(!v.customerPhone&&!v.customerEmail)c.addIssue({code:"custom",path:["customerPhone"],message:"กรุณาระบุเบอร์โทรหรืออีเมล"});
  const duration=Date.parse(v.endsAt)-Date.parse(v.startsAt);
  if(duration<=0||duration>8*3600000)c.addIssue({code:"custom",path:["endsAt"],message:"เวลาสิ้นสุดต้องหลังเวลาเริ่ม ไม่เกิน 8 ชั่วโมง"});
});
export const appointmentChangeSchema=z.object({
  id:z.uuid(),version:z.number().int().positive(),action:z.enum(["reschedule","confirm","cancel"]),
  startsAt:z.iso.datetime({offset:true}).optional(),endsAt:z.iso.datetime({offset:true}).optional(),notes:z.string().max(2000).optional(),
}).strict();
export type Appointment={id:string;property_id:string;customer_name:string;customer_phone:string|null;customer_email:string|null;starts_at:string;ends_at:string;status:"requested"|"confirmed"|"cancelled";notes:string;version:number};
export const appointmentStatus={requested:"รอยืนยัน",confirmed:"ยืนยันแล้ว",cancelled:"ยกเลิกแล้ว"};

export function bangkokDate(value:Date|string) {
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
}
export function bangkokDateTime(value:string) {
  return new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
}
export function bangkokLocalToIso(value:string) {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error("INVALID_LOCAL_TIME");
  const parsed=new Date(`${value}:00+07:00`);
  if(!Number.isFinite(parsed.getTime())||new Date(parsed.getTime()+7*3600000).toISOString().slice(0,16)!==value)throw new Error("INVALID_LOCAL_TIME");
  return parsed.toISOString();
}
export function calendarDays(month:string) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error("INVALID_MONTH");
  const first=new Date(`${month}-01T00:00:00Z`);
  first.setUTCDate(first.getUTCDate()-first.getUTCDay());
  return Array.from({length:42},(_,i)=>new Date(first.getTime()+i*86400000).toISOString().slice(0,10));
}
export function appointmentError(code:string) {
  if(code.includes("OVERLAP"))return "เวลานี้มีนัดอื่นแล้ว กรุณาเลือกเวลาใหม่";
  if(code.includes("VERSION_CONFLICT"))return "ข้อมูลนัดเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่";
  if(code.includes("TIME_INVALID"))return "กรุณาระบุเวลานัดในอนาคต ภายในหนึ่งปี";
  return "บันทึกนัดไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่";
}
