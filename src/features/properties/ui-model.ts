export type PropertyUiAction = "edit" | "ai" | "publish" | "view";

export function propertyUiActions(
  status: string,
  hasCurrentConfirmation = false,
): PropertyUiAction[] {
  if (status === "draft" || status === "pending_confirmation")
    return ["edit", "ai", "publish"];
  if (status === "published") return ["edit", "view"];
  if ((status === "sold" || status === "inactive") && hasCurrentConfirmation)
    return ["edit", "publish"];
  return [];
}

export function quotaCopy(used: number, limit: number) {
  return {
    label: `เผยแพร่แล้ว ${used} จาก ${limit}`,
    remaining:
      used >= limit ? "ใช้สิทธิ์ครบแล้ว" : `เหลืออีก ${limit - used} รายการ`,
  };
}

export const statusCopy: Record<string, string> = {
  draft: "ยังไม่เผยแพร่",
  pending_confirmation: "พร้อมเผยแพร่",
  published: "เผยแพร่แล้ว",
  sold: "ขายแล้ว",
  inactive: "ไม่ใช้งาน",
  archived: "เก็บเข้าคลัง",
};

export const statusDescription: Record<string, string> = {
  draft: "ข้อมูลนี้ยังเป็นส่วนตัว กดเผยแพร่เมื่อพร้อมให้ลูกค้าเห็น",
  pending_confirmation: "กดเผยแพร่เพื่อให้ลูกค้าเห็นประกาศนี้บนเว็บไซต์",
  published: "ลูกค้าสามารถเห็นประกาศนี้บนเว็บไซต์แล้ว",
  sold: "เก็บสถานะไว้เพื่อบันทึกว่าทรัพย์ขายแล้ว",
  inactive: "หยุดแสดงประกาศชั่วคราว",
  archived: "ซ่อนทรัพย์จากรายการทำงานและเว็บไซต์ โดยเก็บข้อมูลไว้ ไม่ลบรูปหรือข้อมูล",
};
