import { describe, expect, it } from "vitest";
import {
  createFakeLineNotificationDriver,
  lineNotificationJobSchema,
  canDeliverLineNotification,
} from "./notification";

describe("LINE notification boundary", () => {
  it("queues ID-only jobs and requires active consent under cap", async () => {
    expect(
      lineNotificationJobSchema.parse({
        notificationId: "n1",
        schemaVersion: 1,
      }),
    ).toEqual({ notificationId: "n1", schemaVersion: 1 });
    expect(() =>
      lineNotificationJobSchema.parse({
        notificationId: "n1",
        tenantId: "t1",
        schemaVersion: 1,
      }),
    ).toThrow();
    expect(
      canDeliverLineNotification({
        activeLink: true,
        consent: true,
        sent: 2,
        cap: 3,
      }),
    ).toBe(true);
    expect(
      canDeliverLineNotification({
        activeLink: true,
        consent: true,
        sent: 3,
        cap: 3,
      }),
    ).toBe(false);
    await expect(
      createFakeLineNotificationDriver().deliver({ notificationId: "n1" }),
    ).resolves.toEqual({
      provider: "fake-line-development",
      receiptId: "fake-line:n1",
    });
  });
});
