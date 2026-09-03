import { describe, expect, it } from "vitest";
import { authorizeWorkerTrigger } from "./trigger-auth";

describe("protected worker trigger", () => {
  it("accepts an exact bearer secret", () => {
    expect(authorizeWorkerTrigger("Bearer correct-secret-value", "correct-secret-value")).toBe(true);
  });

  it.each([undefined, "", "Bearer wrong", "Basic correct-secret-value"])("fails closed for invalid authorization", (authorization) => {
    expect(authorizeWorkerTrigger(authorization, "correct-secret-value")).toBe(false);
  });

  it("fails closed when the configured secret is absent", () => {
    expect(authorizeWorkerTrigger("Bearer anything", undefined)).toBe(false);
  });
});
