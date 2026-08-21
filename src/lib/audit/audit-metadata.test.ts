import { describe, expect, it } from "vitest";
import { safeAuditMetadata } from "./audit-metadata";

describe("safeAuditMetadata", () => {
  it("keeps only non-sensitive allowlisted correlation fields", () => {
    expect(safeAuditMetadata({ requestId: "req-1", source: "dashboard", latitude: 18.1, secret: "no", email: "private@example.com" })).toEqual({ requestId: "req-1", source: "dashboard" });
  });

  it("drops invalid or oversized values", () => {
    expect(safeAuditMetadata({ requestId: "x".repeat(201), source: { forged: true } })).toEqual({});
  });
});
