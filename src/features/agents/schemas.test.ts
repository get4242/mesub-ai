import { describe, expect, it } from "vitest";
import { agentProfileUpdateSchema } from "./schemas";

describe("agent profile schema", () => {
  it("rejects system-controlled verification and tenant fields", () => {
    expect(agentProfileUpdateSchema.safeParse({ publicDisplayName: "Agent", slug: "agent", tenantId: "forged" }).success).toBe(false);
    expect(agentProfileUpdateSchema.safeParse({ publicDisplayName: "Agent", slug: "agent", verificationStatus: "verified" }).success).toBe(false);
  });
});
