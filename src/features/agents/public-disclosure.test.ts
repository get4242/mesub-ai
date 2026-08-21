import { describe, expect, it } from "vitest";
import { toPublicAgentProfile } from "./public-disclosure";

describe("public Agent disclosure", () => {
  it("returns only allowlisted profile and opted-in contact fields", () => {
    const output = toPublicAgentProfile({ id: "agent-a", tenant_id: "tenant-secret", user_id: "user-secret", public_display_name: "Agent A", slug: "agent-a", brand_name: "Brand", bio: "Bio", public_email: "public@example.com", public_phone: "0812345678", show_email: true, show_phone: false, verification_status: "verified", private_note: "never" });
    expect(output).toEqual({ displayName: "Agent A", slug: "agent-a", brandName: "Brand", bio: "Bio", email: "public@example.com", phone: null, verified: true });
    expect(JSON.stringify(output)).not.toMatch(/tenant-secret|user-secret|private_note|0812345678/);
  });
});
