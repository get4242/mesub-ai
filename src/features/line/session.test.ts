import { describe, expect, it } from "vitest";
import { createSubjectHash, normalizeReturnPath, resolveLineSession } from "./session";

describe("LINE trusted session boundary", () => {
  it("hashes a verified subject and never returns the raw subject", () => {
    const hash = createSubjectHash("line-subject", "development-secret-that-is-long");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("line-subject");
  });

  it("allows only known relative destinations", () => {
    expect(normalizeReturnPath("/dashboard/properties")).toBe("/dashboard/properties");
    expect(normalizeReturnPath("https://evil.example")).toBe("/dashboard");
    expect(normalizeReturnPath("//evil.example")).toBe("/dashboard");
    expect(normalizeReturnPath("/admin")).toBe("/dashboard");
  });

  it("maps only a server-verified subject to one active internal user", async () => {
    const result = await resolveLineSession(
      { verifiedSubject: "subject", providerId: "provider", environment: "development", hashKey: "development-secret-that-is-long" },
      { findActiveUser: async () => "user-1" },
    );
    expect(result).toEqual({ ok: true, userId: "user-1" });
  });

  it("does not auto-link an unknown identity", async () => {
    const result = await resolveLineSession(
      { verifiedSubject: "unknown", providerId: "provider", environment: "development", hashKey: "development-secret-that-is-long" },
      { findActiveUser: async () => null },
    );
    expect(result).toEqual({ ok: false, code: "LINE_ACCOUNT_NOT_LINKED" });
  });
});
