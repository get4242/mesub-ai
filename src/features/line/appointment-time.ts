import { bangkokDate, bangkokLocalToIso } from "../appointments/domain";

// Only explicit dates/times are accepted; ambiguous language prompts clarification.
export function parseAppointmentTime(text: string, now = new Date()) {
  let date: string | undefined = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (!date && /มะรืน|พรุ่งนี้|วันนี้/.test(text)) {
    const offset = /มะรืน/.test(text) ? 2 : /พรุ่งนี้/.test(text) ? 1 : 0;
    date = bangkokDate(new Date(now.getTime() + offset * 86400000));
  }
  const numeric = text.match(/(?:เวลา\s*)?\b([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s*น\.?|\b)/);
  const words: Record<string, number> = { หนึ่ง: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6 };
  const afternoon = text.match(/บ่าย(โมง|หนึ่ง|สอง|สาม|สี่|ห้า|หก)(ครึ่ง)?/);
  const noon = /เที่ยง(ครึ่ง)?/.exec(text);
  let hour: number | undefined = numeric ? Number(numeric[1]) : undefined;
  let minute = numeric ? Number(numeric[2]) : 0;
  if (!numeric && afternoon?.[1]) { hour = 12 + (afternoon[1] === "โมง" ? 1 : words[afternoon[1]]!); minute = afternoon[2] ? 30 : 0; }
  if (hour === undefined && noon) { hour = 12; minute = noon[1] ? 30 : 0; }
  if (!date || hour === undefined) return null;
  try {
    const startsAt = bangkokLocalToIso(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    if (Date.parse(startsAt) <= now.getTime() || Date.parse(startsAt) > now.getTime() + 366 * 86400000) return null;
    return { startsAt, endsAt: new Date(Date.parse(startsAt) + 3600000).toISOString() };
  } catch { return null; }
}

export function appointmentContact(text: string) {
  const phone = text.match(/(?:โทร\s*)?(0[689]\d(?:[ -]?\d){7})\b/)?.[1]?.replace(/[ -]/g, "");
  const name = text.match(/ชื่อ\s*([^\n,]+?)(?=\s*(?:โทร|เบอร์|0[689]\d)|$)/)?.[1]?.trim();
  return name && phone ? { customerName: name.slice(0, 120), customerPhone: phone } : null;
}
