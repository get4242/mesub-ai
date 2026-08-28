import { describe, expect, it } from "vitest";
import { nextDeliveryState } from "./delivery-state";

describe("notification delivery retry", () => {
  it("delivers once after a successful claim", () => {
    expect(nextDeliveryState("queued", "claim", 0, 3)).toBe("running");
    expect(nextDeliveryState("running", "deliver", 1, 3)).toBe("delivered");
  });
  it("requeues transient failures and dead-letters at the cap", () => {
    expect(nextDeliveryState("running", "transient_failure", 1, 3)).toBe("queued");
    expect(nextDeliveryState("running", "transient_failure", 3, 3)).toBe("dead_letter");
  });
});
