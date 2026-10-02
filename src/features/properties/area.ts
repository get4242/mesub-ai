type AreaInput =
  | { unit: "sqm"; value: string }
  | { unit: "sqwah"; value: string }
  | { unit: "rai_ngan_sqwah"; rai: number | string; ngan: number | string; sqwah: number | string };

function decimalParts(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error("INVALID_AREA");
  const [whole = "0", fraction = ""] = value.split(".");
  return { integer: BigInt(`${whole}${fraction}`), scale: fraction.length };
}

function formatDecimal(integer: bigint, scale: number) {
  const negative = integer < 0n;
  let digits = (negative ? -integer : integer).toString().padStart(scale + 1, "0");
  if (scale > 0) digits = `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  digits = digits.replace(/^0+(?=\d)/, "").replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  return `${negative ? "-" : ""}${digits}`;
}

function multiplyDecimal(value: string, multiplier: bigint) {
  const parsed = decimalParts(value);
  return formatDecimal(parsed.integer * multiplier, parsed.scale);
}

export function normalizeArea(input: AreaInput): { squareMetres: string } {
  if (input.unit === "sqm") return { squareMetres: multiplyDecimal(input.value, 1n) };
  if (input.unit === "sqwah") return { squareMetres: multiplyDecimal(input.value, 4n) };
  if (![input.rai, input.ngan].every((value) => /^\d+$/.test(String(value)))) {
    throw new Error("INVALID_AREA");
  }
  const wah = decimalParts(String(input.sqwah));
  const factor = 10n ** BigInt(wah.scale);
  return { squareMetres: formatDecimal((BigInt(input.rai) * 1600n + BigInt(input.ngan) * 400n) * factor + wah.integer * 4n, wah.scale) };
}
