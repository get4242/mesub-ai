import { describe, expect, it } from "vitest";
import { assertPhase1Transition } from "./state-machine";

describe("Phase 1 property state machine", () => {
  it.each([["draft", "pending_confirmation"], ["pending_confirmation", "draft"], ["draft", "archived"], ["pending_confirmation", "archived"]])("allows %s to %s", (from, to) => {
    expect(() => assertPhase1Transition(from, to)).not.toThrow();
  });

  it.each(["draft", "pending_confirmation", "inactive", "sold"])("blocks publishing from %s", (from) => {
    expect(() => assertPhase1Transition(from, "published")).toThrow("PUBLISH_NOT_AVAILABLE_IN_PHASE_1");
  });

  it("rejects unsupported transitions", () => {
    expect(() => assertPhase1Transition("archived", "draft")).toThrow("INVALID_TRANSITION");
  });
});
