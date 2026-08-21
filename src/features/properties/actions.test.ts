import { describe, expect, it } from "vitest";
import { createPropertyDraft, updatePropertyDraft, type PropertyRepository } from "./action-logic";

const context = { userId: "user-a", tenantId: "tenant-a", membershipId: "membership-a", agentProfileId: "agent-a" };
const draft = {
  listingType: "sale" as const,
  propertyType: "land" as const,
  title: "Land",
  description: "Description",
  province: "Chiang Mai",
  district: "Mueang",
  price: "1000000",
  currency: "THB" as const,
  landAreaSquareMetres: "400"
};

describe("property mutation logic", () => {
  it("derives tenant and owner solely from trusted context", async () => {
    let received: Parameters<PropertyRepository["createDraft"]>[0] | undefined;
    const repository: PropertyRepository = {
      createDraft: async (value) => { received = value; return { id: "property-a", version: 1, criticalVersion: 1 }; },
      updateDraft: async () => null
    };
    await expect(createPropertyDraft(draft, context, repository)).resolves.toMatchObject({ ok: true });
    expect(received).toMatchObject({ tenantId: "tenant-a", ownerAgentId: "agent-a" });
  });

  it("reports stale conditional updates as version conflicts", async () => {
    const repository: PropertyRepository = { createDraft: async () => { throw new Error("unused"); }, updateDraft: async () => null };
    await expect(updatePropertyDraft({ propertyId: "550e8400-e29b-41d4-a716-446655440000", expectedVersion: 3, title: "New" }, context, repository)).resolves.toMatchObject({ ok: false, code: "VERSION_CONFLICT" });
  });

  it("returns an updated version supplied by the guarded database update", async () => {
    const repository: PropertyRepository = { createDraft: async () => { throw new Error("unused"); }, updateDraft: async () => ({ id: "property-a", version: 4, criticalVersion: 2 }) };
    await expect(updatePropertyDraft({ propertyId: "550e8400-e29b-41d4-a716-446655440000", expectedVersion: 3, description: "New description" }, context, repository)).resolves.toEqual({ ok: true, data: { id: "property-a", version: 4, criticalVersion: 2 } });
  });
});
