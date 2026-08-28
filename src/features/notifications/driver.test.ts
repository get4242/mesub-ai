import { describe, expect, it } from "vitest";
import { FakeDevelopmentEmailDriver, notificationJobSchema } from "./driver";

describe("notification boundary", () => {
  it("accepts ID-only versioned jobs and rejects embedded personal data", () => {
    expect(notificationJobSchema.parse({ notificationId: "notification-a", schemaVersion: 1 })).toEqual({ notificationId: "notification-a", schemaVersion: 1 });
    expect(() => notificationJobSchema.parse({ notificationId: "notification-a", schemaVersion: 1, email: "private@example.com" })).toThrow();
  });

  it("fake Development email is deterministic and performs no external delivery", async () => {
    const driver = new FakeDevelopmentEmailDriver();
    expect(await driver.deliver({ notificationId: "notification-a" })).toEqual({ provider: "fake-development", receiptId: "fake:notification-a" });
  });
});
