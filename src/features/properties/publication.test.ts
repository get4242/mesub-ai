import { describe, expect, it } from "vitest";
import { publishProperty, type PublicationRepository } from "./publication";

const context = { tenantId: "tenant-a", userId: "user-a" };

function repository(result: Awaited<ReturnType<PublicationRepository["publish"]>>): PublicationRepository {
  return { publish: async () => result };
}

describe("publishProperty", () => {
  it("passes tenant authority and the idempotency key to the atomic repository", async () => {
    let received: unknown;
    const repo: PublicationRepository = {
      async publish(input) {
        received = input;
        return { outcome: "published", propertyId: input.propertyId, publishedCount: 1, limit: 3 };
      }
    };

    const result = await publishProperty(
      { propertyId: "property-a", expectedVersion: 4, idempotencyKey: "publish-request-a" },
      context,
      repo
    );

    expect(received).toEqual({
      tenantId: "tenant-a",
      userId: "user-a",
      propertyId: "property-a",
      expectedVersion: 4,
      idempotencyKey: "publish-request-a"
    });
    expect(result.ok).toBe(true);
  });

  it.each(["quota_exceeded", "validation_failed", "forbidden", "conflict"] as const)(
    "returns stable %s failure without hiding the draft",
    async (outcome) => {
      const result = await publishProperty(
        { propertyId: "property-a", expectedVersion: 4, idempotencyKey: "publish-request-a" },
        context,
        repository({ outcome })
      );
      expect(result).toEqual({ ok: false, code: outcome.toUpperCase() });
    }
  );
});
