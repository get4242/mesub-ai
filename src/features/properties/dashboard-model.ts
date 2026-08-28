export function propertyListState(properties: unknown[]) {
  return properties.length === 0
    ? { empty: true as const, title: "เพิ่มทรัพย์รายการแรก", actionLabel: "เพิ่มทรัพย์" }
    : { empty: false as const, title: "ทรัพย์ของคุณ", actionLabel: "เพิ่มทรัพย์" };
}

export function propertyMutationMessage(code: string) {
  if (code === "VERSION_CONFLICT") return "มีข้อมูลเวอร์ชันใหม่กว่า กรุณาโหลดข้อมูลอีกครั้งก่อนบันทึก";
  if (code === "INVALID_INPUT") return "กรุณาตรวจสอบข้อมูลและแก้ไขช่องที่ไม่ถูกต้อง";
  return "บันทึกไม่สำเร็จ กรุณาลองใหม่";
}

export function publicationMessage(code: string) {
  if (code === "QUOTA_EXCEEDED") return "ถึงขีดจำกัดแพ็กเกจ Free แล้ว ร่างของคุณยังอยู่ครบ กรุณาปิดประกาศที่ขายแล้วหรือรอการอัปเกรดแพ็กเกจ";
  if (code === "VALIDATION_FAILED") return "ต้องยืนยันข้อมูลเวอร์ชันล่าสุดและแก้ข้อมูลที่ยังไม่ครบก่อนเผยแพร่";
  if (code === "CONFLICT") return "ข้อมูลเปลี่ยนแปลงแล้ว กรุณาโหลดหน้าใหม่ก่อนเผยแพร่";
  return "ไม่สามารถเผยแพร่ได้ในขณะนี้";
}
