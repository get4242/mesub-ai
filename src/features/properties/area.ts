type AreaInput =
  | { unit: "sqm"; value: string }
  | { unit: "sqwah"; value: string }
  | { unit: "rai_ngan_sqwah"; rai: number; ngan: number; sqwah: number };

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
  if (![input.rai, input.ngan, input.sqwah].every(Number.isInteger) || input.rai < 0 || input.ngan < 0 || input.sqwah < 0) {
    throw new Error("INVALID_AREA");
  }
  return { squareMetres: String(input.rai * 1600 + input.ngan * 400 + input.sqwah * 4) };
}
