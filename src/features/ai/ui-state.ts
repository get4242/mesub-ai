const critical=new Set(["listing_type","property_type","province","district","subdistrict","address_line","latitude","longitude","price","land_area_sqm","building_area_sqm","bedrooms","bathrooms"]);
export function intakeSubmitState(text:string,count:number){return text.trim()||count?{disabled:false,message:""}:{disabled:true,message:"เพิ่มข้อความหรือเลือกรูปอย่างน้อย 1 รายการ"}}
export function aiSubmitMessage(result:{ok:boolean;code?:string}) {
  if (result.ok) return "AI รับข้อมูลแล้ว กำลังจัดคำแนะนำให้";
  if (result.code === "AI_LIMIT_REACHED") return "วันนี้ใช้ AI ครบตามจำนวนที่กำหนดแล้ว กรุณาลองใหม่ภายหลัง";
  if (result.code === "VERSION_CONFLICT") return "ข้อมูลทรัพย์ถูกแก้ไขแล้ว กรุณาโหลดหน้าใหม่ก่อนส่งให้ AI";
  if (result.code === "INVALID_INPUT") return "กรุณาเพิ่มข้อความหรือเลือกรูปที่อัปโหลดสำเร็จแล้ว";
  if (result.code === "NOT_FOUND") return "ไม่พบทรัพย์หรือรูปภาพที่เลือก กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง";
  return "ส่งข้อมูลให้ AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}
export function runStatusCopy(state:string){return state==="queued"||state==="running"?"ระบบกำลังทำงาน คุณออกจากหน้านี้ได้ ระบบจะทำงานต่อให้":state==="succeeded"?"AI จัดข้อมูลเสร็จแล้ว":"งาน AI ไม่สำเร็จ กรุณาตรวจสอบและลองใหม่"}
export function suggestionGroups<T extends{fieldKey:string}>(items:T[]){return{critical:items.filter(i=>critical.has(i.fieldKey)),content:items.filter(i=>!critical.has(i.fieldKey))}}
