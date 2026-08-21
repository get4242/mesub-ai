import { describe, expect, it } from "vitest";
import { createLogRecord } from "./logger";

describe("structured logging", () => {
  it("redacts secrets and customer contact fields recursively", () => {
    expect(
      createLogRecord("info", "lead.received", {
        tenantId: "tenant-1",
        email: "customer@example.com",
        nested: { accessToken: "line-token", result: "accepted" }
      })
    ).toMatchObject({
      level: "info",
      event: "lead.received",
      context: {
        tenantId: "tenant-1",
        email: "[REDACTED]",
        nested: { accessToken: "[REDACTED]", result: "accepted" }
      }
    });
  });

  it("does not mutate the caller context", () => {
    const context = { apiKey: "secret", safe: "value" };
    createLogRecord("warn", "provider.failure", context);
    expect(context).toEqual({ apiKey: "secret", safe: "value" });
  });
});
