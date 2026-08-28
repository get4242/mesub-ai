import { describe, expect, it } from "vitest";
import { getEffectiveConfirmation } from "./confirmation";

describe("property confirmation", () => {
  it("distinguishes confirmed, invalidated, and archived", () => {
    expect(getEffectiveConfirmation({ criticalVersion: 2, status: "draft" }, { criticalVersion: 2 })).toEqual({ status: "confirmed", storedCriticalVersion: 2, currentCriticalVersion: 2 });
    expect(getEffectiveConfirmation({ criticalVersion: 3, status: "draft" }, { criticalVersion: 2 })).toEqual({ status: "invalidated", storedCriticalVersion: 2, currentCriticalVersion: 3 });
    expect(getEffectiveConfirmation({ criticalVersion: 2, status: "archived" }, { criticalVersion: 2 }).status).toBe("invalidated");
  });
  it("returns unconfirmed without history", () => {
    expect(getEffectiveConfirmation({ criticalVersion: 1, status: "draft" }, null)).toEqual({ status: "unconfirmed", storedCriticalVersion: null, currentCriticalVersion: 1 });
  });
});
