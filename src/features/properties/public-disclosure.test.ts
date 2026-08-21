import { describe, expect, it } from "vitest";
import { toPublicPropertyDisclosure } from "./public-disclosure";

describe("reserved public Property disclosure", () => {
  it("omits exact location, ownership and audit fields", () => {
    const output = toPublicPropertyDisclosure({ id: "property-a", tenant_id: "tenant-secret", owner_agent_id: "owner-secret", title: "Home", description: "Description", province: "Chiang Mai", district: "Mueang", listing_type: "sale", property_type: "detached_house", price: "2500000", currency: "THB", latitude: "18.123456", longitude: "98.123456", audit_metadata: { secret: true } });
    expect(output).toEqual({ id: "property-a", title: "Home", description: "Description", province: "Chiang Mai", district: "Mueang", listingType: "sale", propertyType: "detached_house", price: "2500000", currency: "THB" });
    expect(JSON.stringify(output)).not.toMatch(/tenant-secret|owner-secret|18\.123456|98\.123456|audit/);
  });
});
