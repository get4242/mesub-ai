import { describe, expect, it, vi } from "vitest";
import { FakeDevelopmentEmailDriver } from "./driver";
import { processNotification } from "./process-notification";

describe("processNotification", () => {
  it("claims and completes a fake Development email exactly once", async () => {
    const repository = { claim: vi.fn().mockResolvedValue({ notificationId: "notification-a", attempt: 1 }), complete: vi.fn(), fail: vi.fn() };
    await processNotification("notification-a", repository, new FakeDevelopmentEmailDriver());
    expect(repository.complete).toHaveBeenCalledWith("notification-a", "fake-development", "fake:notification-a");
    expect(repository.fail).not.toHaveBeenCalled();
  });

  it("records a bounded failure without throwing into lead capture", async () => {
    const repository = { claim: vi.fn().mockResolvedValue({ notificationId: "notification-a", attempt: 2 }), complete: vi.fn(), fail: vi.fn() };
    const driver = { deliver: vi.fn().mockRejectedValue(new Error("provider unavailable")) };
    await expect(processNotification("notification-a", repository, driver)).resolves.toEqual({ status: "retry_scheduled" });
    expect(repository.fail).toHaveBeenCalledWith("notification-a", "DELIVERY_FAILED");
  });
});
