import { describe, expect, it } from "vitest";
import { routeLineEvent, nextLineJobState } from "./worker";

describe("LINE durable worker", () => {
  it("keeps general messages in platform intake and never invents a tenant", () => {
    expect(
      routeLineEvent({
        type: "message",
        text: "สนใจหาบ้าน",
        propertyId: null,
        consent: true,
      }),
    ).toEqual({ kind: "general", route: "platform_intake" });
    expect(
      routeLineEvent({
        type: "message",
        text: "สนใจ",
        propertyId: "property-1",
        consent: true,
      }),
    ).toEqual({
      kind: "property",
      route: "canonical_property_owner",
      propertyId: "property-1",
    });
  });
  it("requires consent and has bounded retry/dead-letter states", () => {
    expect(
      routeLineEvent({
        type: "message",
        text: "hello",
        propertyId: null,
        consent: false,
      }),
    ).toEqual({ kind: "consent_required" });
    expect(nextLineJobState("running", "transient_failure", 1, 3)).toBe(
      "queued",
    );
    expect(nextLineJobState("running", "transient_failure", 3, 3)).toBe(
      "dead_letter",
    );
  });
});
