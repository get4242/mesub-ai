import { describe, expect, it } from "vitest";
import { nextRunState } from "./run-state-machine";

describe("AI run state machine", () => {
  it("allows normal and bounded retry transitions", () => {
    expect(nextRunState("queued", "claim", 0, 3)).toBe("running");
    expect(nextRunState("running", "succeed", 1, 3)).toBe("succeeded");
    expect(nextRunState("running", "transient_failure", 1, 3)).toBe("queued");
    expect(nextRunState("running", "transient_failure", 3, 3)).toBe("dead_letter");
  });
  it("rejects terminal transitions and preserves cancellation", () => {
    expect(() => nextRunState("succeeded", "claim", 1, 3)).toThrow("INVALID_RUN_TRANSITION");
    expect(nextRunState("cancelled", "claim", 0, 3)).toBe("cancelled");
  });
});
