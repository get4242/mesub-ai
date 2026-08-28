import { describe, expect, it } from "vitest";
import { toPublicPropertyCard } from "./public-view-model";

describe("toPublicPropertyCard", () => {
  it("formats allowlisted projection data without accepting canonical private fields", () => {
    const card = toPublicPropertyCard({ id: "id", slug: "slug", title: "Home", province: "Chiang Mai", district: "Mueang", listing_type: "sale", property_type: "land", price: 2500000, currency: "THB" });
    expect(card).toEqual({ id: "id", slug: "slug", title: "Home", location: "Mueang, Chiang Mai", listingType: "sale", propertyType: "land", price: "฿2,500,000" });
    expect(JSON.stringify(card)).not.toMatch(/tenant|latitude|longitude|address/);
  });
});
