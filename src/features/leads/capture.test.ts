import { describe, expect, it } from "vitest";
import { parseLeadCapture } from "./capture";

describe("parseLeadCapture", () => {
  it("accepts a consented property enquiry without a client tenant destination", () => {
    expect(parseLeadCapture({ kind: "property", propertyId: "31000000-0000-4000-8000-000000000001", name: "Buyer", email: "buyer@example.com", message: "Interested", consent: true, consentVersion: "privacy-v1", idempotencyKey: "lead-request-001" })).toMatchObject({ kind: "property", propertyId: "31000000-0000-4000-8000-000000000001" });
  });

  it("rejects missing consent and missing contact channels", () => {
    expect(() => parseLeadCapture({ kind: "general", name: "Buyer", message: "Help", consent: false, consentVersion: "privacy-v1", idempotencyKey: "lead-request-002" })).toThrow();
  });

  it("strips unknown authority fields", () => {
    expect(parseLeadCapture({ kind: "general", name: "Buyer", phone: "0800000000", message: "Help", consent: true, consentVersion: "privacy-v1", idempotencyKey: "lead-request-003", tenantId: "attacker" })).not.toHaveProperty("tenantId");
  });
});
