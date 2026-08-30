export const dashboardNavigation = [
  { href: "/design-preview/dashboard", label: "ภาพรวม", icon: "⌂" },
  {
    href: "/design-preview/dashboard/properties",
    label: "ทรัพย์ของฉัน",
    icon: "▤",
  },
  {
    href: "/design-preview/dashboard/leads",
    label: "ลูกค้าที่สนใจ",
    icon: "◎",
  },
  {
    href: "/design-preview/dashboard/profile",
    label: "โปรไฟล์ของฉัน",
    icon: "◯",
  },
] as const;

export type PreviewPropertyState = "draft" | "ai" | "confirmed" | "published";

const editHref = "/design-preview/dashboard/properties/demo/edit";

const actionsByState = {
  draft: [
    { label: "แก้ไข", href: editHref, emphasis: false },
    {
      label: "ให้ AI ช่วย",
      href: "/design-preview/dashboard/properties/demo/ai",
      emphasis: true,
    },
  ],
  ai: [
    { label: "แก้ไข", href: editHref, emphasis: false },
    {
      label: "ตรวจคำแนะนำ",
      href: "/design-preview/dashboard/properties/demo/ai",
      emphasis: true,
    },
  ],
  confirmed: [
    { label: "แก้ไข", href: editHref, emphasis: false },
    { label: "เผยแพร่", href: editHref, emphasis: true },
  ],
  published: [
    { label: "แก้ไข", href: editHref, emphasis: false },
    {
      label: "ดูประกาศ",
      href: "/design-preview/properties/chiang-mai-mountain-view",
      emphasis: true,
    },
  ],
} as const;

export function propertyActions(state: PreviewPropertyState) {
  return actionsByState[state];
}

export const createPropertySections = [
  "ข้อมูลพื้นฐานของทรัพย์",
  "ราคาและทำเล",
  "รายละเอียดทรัพย์",
  "รูปภาพทรัพย์",
] as const;

export const createPropertyActions = [
  "บันทึกและให้ AI ช่วยจัดข้อมูล",
  "บันทึกเป็นแบบร่าง",
] as const;

export const designPreviewSurfaces = [
  "public-landing",
  "property-search",
  "property-detail",
  "agent-dashboard",
  "property-management",
  "property-editor",
  "ai-assisted-intake",
  "leads",
  "agent-profile",
] as const;
