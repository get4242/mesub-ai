import { describe, expect, it, vi } from "vitest";
import { processLineNotification } from "./process-notification";
import { createFakeLineNotificationDriver } from "./notification";

describe("consent-aware LINE notification processing", () => {
  it("resolves all private data server-side and delivers minimal content", async () => {
    const repository = {
      claim: vi.fn().mockResolvedValue({ notificationId: "n1", destination: "U1", message: "มีลูกค้าสนใจทรัพย์ของคุณ", attempt: 1 }),
      complete: vi.fn(), fail: vi.fn(),
    };
    await expect(processLineNotification("n1", repository, createFakeLineNotificationDriver())).resolves.toEqual({ status: "delivered" });
    expect(repository.complete).toHaveBeenCalledWith("n1", "fake-line-development", "fake-line:n1");
  });
  it("skips revoked/no-consent/cap-exhausted destinations", async () => {
    const repository = { claim: vi.fn().mockResolvedValue(null), complete: vi.fn(), fail: vi.fn() };
    await expect(processLineNotification("n1", repository, createFakeLineNotificationDriver())).resolves.toEqual({ status: "not_deliverable" });
  });
  it("uses bounded repository retry/dead-letter state on failure", async () => {
    const repository = {
      claim: vi.fn().mockResolvedValue({ notificationId: "n1", destination: "U1", message: "มีลูกค้าสนใจทรัพย์ของคุณ", attempt: 3 }),
      complete: vi.fn(), fail: vi.fn().mockResolvedValue("dead_letter"),
    };
    const driver = { deliver: vi.fn().mockRejectedValue(new Error("provider private detail")) };
    await expect(processLineNotification("n1", repository, driver)).resolves.toEqual({ status: "dead_letter" });
    expect(repository.fail).toHaveBeenCalledWith("n1", "LINE_DELIVERY_FAILED");
  });
});
