import { describe, expect, it } from "vitest";
import { CRITICAL_PROPERTY_FIELDS, propertyDraftSchema, propertyUpdateSchema } from "./schemas";

const common = {
  listingType: "sale",
  title: "บ้านทดสอบ",
  description: "รายละเอียดทรัพย์",
  province: "เชียงใหม่",
  district: "เมืองเชียงใหม่",
  price: "2500000",
  currency: "THB"
} as const;

describe("property schemas", () => {
  it.each([
    ["land", { landAreaSquareMetres: "400" }],
    ["detached_house", { buildingAreaSquareMetres: "120", bedrooms: 3, bathrooms: 2 }],
    ["townhouse", { buildingAreaSquareMetres: "90", bedrooms: 2, bathrooms: 2 }],
    ["condominium", { buildingAreaSquareMetres: "35", bedrooms: 1, bathrooms: 1 }],
    ["commercial_building", { buildingAreaSquareMetres: "180" }],
    ["other", { landAreaSquareMetres: "100" }]
  ])("accepts approved %s conditional fields", (propertyType, fields) => {
    expect(propertyDraftSchema.safeParse({ ...common, propertyType, ...fields }).success).toBe(true);
  });

  it("rejects a detached house without bedrooms, bathrooms and building area", () => {
    expect(propertyDraftSchema.safeParse({ ...common, propertyType: "detached_house", landAreaSquareMetres: "400" }).success).toBe(false);
  });

  it("rejects browser-controlled tenant, owner and moderation fields", () => {
    expect(propertyDraftSchema.safeParse({ ...common, propertyType: "land", landAreaSquareMetres: "400", tenantId: "forged" }).success).toBe(false);
  });

  it("requires property id and expected version for updates", () => {
    expect(propertyUpdateSchema.safeParse({ propertyId: "550e8400-e29b-41d4-a716-446655440000", expectedVersion: 2, title: "แก้ไข" }).success).toBe(true);
    expect(propertyUpdateSchema.safeParse({ propertyId: "550e8400-e29b-41d4-a716-446655440000", title: "แก้ไข" }).success).toBe(false);
  });

  it("identifies ownership, terms, location and area as critical", () => {
    expect(CRITICAL_PROPERTY_FIELDS).toEqual(expect.arrayContaining(["listingType", "propertyType", "price", "province", "district", "latitude", "longitude", "landAreaSquareMetres", "buildingAreaSquareMetres"]));
  });
});
