export function formatLandArea(squareMetres: number | string | null | undefined) {
  const squareWah = Math.round(Number(squareMetres) / 4);
  if (!Number.isFinite(squareWah) || squareWah <= 0) return "ยังไม่ระบุ";

  const rai = Math.floor(squareWah / 400);
  const remainingWah = squareWah % 400;
  const ngan = Math.floor(remainingWah / 100);
  const wah = remainingWah % 100;
  const parts = [rai ? `${rai.toLocaleString("th-TH")} ไร่` : null, ngan ? `${ngan} งาน` : null, wah ? `${wah} ตร.ว.` : null].filter(Boolean);
  return parts.join(" ");
}
