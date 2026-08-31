export type PropertyUiAction = "edit" | "ai" | "publish" | "view";

export function propertyUiActions(
  status: string,
  hasCurrentConfirmation = false,
): PropertyUiAction[] {
  if (status === "draft" || status === "pending_confirmation")
    return hasCurrentConfirmation ? ["edit", "ai", "publish"] : ["edit", "ai"];
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
  draft: "แบบร่าง",
  pending_confirmation: "รอยืนยัน",
  published: "เผยแพร่แล้ว",
  sold: "ขายแล้ว",
  inactive: "ไม่ใช้งาน",
  archived: "เก็บเข้าคลัง",
};
