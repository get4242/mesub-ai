export const DESIGN_BREAKPOINTS = { mobileMax: 620, tabletMax: 950 } as const;
export const MIN_TOUCH_TARGET = 44;
export const MEDIA_LIMIT = 20;
export const AGENT_NAVIGATION = [
  { href: "/dashboard", label: "ภาพรวม", icon: "home" },
  { href: "/dashboard/properties", label: "ทรัพย์ของฉัน", icon: "properties" },
  { href: "/dashboard/leads", label: "ลูกค้าที่สนใจ", icon: "leads" },
  { href: "/dashboard/profile", label: "โปรไฟล์ของฉัน", icon: "profile" },
] as const;
