type PriceDisplayRow = {
  price: number | string;
  currency?: string;
  property_type: string;
  land_area_sqm?: number | string | null;
};

function money(value: number, currency = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Land listings retain their total price for reporting and search, while the
 * customer-facing surfaces show an easier-to-compare price per rai.
 */
export function formatPropertyPrice(row: PriceDisplayRow) {
  const total = Number(row.price);
  const areaSquareMetres = Number(row.land_area_sqm);
  if (
    row.property_type === "land" &&
    Number.isFinite(total) &&
    total >= 1_000_000 &&
    Number.isFinite(areaSquareMetres) &&
    areaSquareMetres > 0
  ) {
    return `${money(total / (areaSquareMetres / 1600), row.currency)} / ไร่`;
  }
  return money(total, row.currency);
}
