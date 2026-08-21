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
