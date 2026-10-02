import { normalizeArea } from "./area";

export function landAreaFromForm(form: FormData): string | undefined {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const unit = text("landAreaUnit");
  if (unit === "rai_ngan_sqwah") {
    const values = [text("landRai"), text("landNgan"), text("landSqwah")];
    return values.some(Boolean) ? normalizeArea({ unit, rai: values[0] || "0", ngan: values[1] || "0", sqwah: values[2] || "0" }).squareMetres : undefined;
  }
  if (unit === "sqwah") return text("landSqwah") ? normalizeArea({ unit, value: text("landSqwah") }).squareMetres : undefined;
  return text("landAreaSquareMetres") || undefined;
}

export function propertyFormInput(form: FormData) {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const number = (key: string) => text(key) === "" ? undefined : Number(text(key));
  return {
    listingType: text("listingType"), propertyType: text("propertyType"),
    title: text("title"), description: text("description"), province: text("province"),
    district: text("district"), subdistrict: text("subdistrict") || undefined,
    price: text("price"), currency: "THB" as const, landAreaSquareMetres: landAreaFromForm(form),
    buildingAreaSquareMetres: text("buildingAreaSquareMetres") || undefined,
    bedrooms: number("bedrooms"), bathrooms: number("bathrooms"),
  };
}
