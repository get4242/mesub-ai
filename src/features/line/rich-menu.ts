export const DEVELOPMENT_RICH_MENU = [
  { label: "ทรัพย์ของฉัน", data: "menu:properties" },
  { label: "นัดหมาย", data: "menu:appointments" },
  { label: "เว็บของฉัน", data: "menu:website" },
] as const;

export function buildRichMenu() {
  return {
    size: { width: 2500, height: 843 }, selected: true,
    name: "Mesub Agent", chatBarText: "เมนู Agent",
    areas: DEVELOPMENT_RICH_MENU.map((item, index) => ({
      bounds: { x: index * 833, y: 0, width: index === 2 ? 834 : 833, height: 843 },
      action: { type: "postback", label: item.label, data: item.data, displayText: item.label },
    })),
  };
}
