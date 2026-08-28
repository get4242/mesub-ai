import { describe, expect, it } from "vitest";
import {
  FREE_ACTIVE_PROPERTY_LIMIT,
  effectiveEntitlement,
  quotaSnapshot
} from "./entitlements";

describe("effectiveEntitlement", () => {
  it("defaults a tenant without an override to the approved Free limit", () => {
    expect(effectiveEntitlement()).toEqual({
      planCode: "free",
      activePropertyLimit: FREE_ACTIVE_PROPERTY_LIMIT
    });
  });

  it("uses a positive effective entitlement supplied by the server", () => {
    expect(effectiveEntitlement({ planCode: "approved-paid", activePropertyLimit: 8 })).toEqual({
      planCode: "approved-paid",
      activePropertyLimit: 8
    });
  });

  it("rejects invalid entitlement limits instead of silently weakening the quota", () => {
    expect(() => effectiveEntitlement({ planCode: "broken", activePropertyLimit: 0 })).toThrow(
      "INVALID_ACTIVE_PROPERTY_LIMIT"
    );
  });
});

describe("quotaSnapshot", () => {
  it("derives remaining capacity from the canonical Published count", () => {
    expect(quotaSnapshot(2, effectiveEntitlement())).toEqual({
      used: 2,
      limit: 3,
      remaining: 1,
      canPublish: true
    });
  });

  it("blocks publication at the limit without producing a negative remainder", () => {
    expect(quotaSnapshot(3, effectiveEntitlement())).toEqual({
      used: 3,
      limit: 3,
      remaining: 0,
      canPublish: false
    });
  });
});
