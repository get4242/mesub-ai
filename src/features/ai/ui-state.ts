const critical=new Set(["listing_type","property_type","province","district","subdistrict","address_line","latitude","longitude","price","land_area_sqm","building_area_sqm","bedrooms","bathrooms"]);
export function intakeSubmitState(text:string,count:number){return text.trim()||count?{disabled:false,message:""}:{disabled:true,message:"เพิ่มข้อความหรือเลือกรูปอย่างน้อย 1 รายการ"}}
export function runStatusCopy(state:string){return state==="queued"||state==="running"?"ระบบกำลังทำงาน คุณออกจากหน้านี้ได้ ระบบจะทำงานต่อให้":state==="succeeded"?"AI จัดข้อมูลเสร็จแล้ว":"งาน AI ไม่สำเร็จ กรุณาตรวจสอบและลองใหม่"}
export function suggestionGroups<T extends{fieldKey:string}>(items:T[]){return{critical:items.filter(i=>critical.has(i.fieldKey)),content:items.filter(i=>!critical.has(i.fieldKey))}}
