import { describe, expect, it } from "vitest";
import { createEmailDriver, createLineDriver } from "./runtime-drivers";

describe("Production delivery driver isolation", () => {
  it("never selects the fake LINE driver in Production", async () => {
    const driver = createLineDriver({ environment: "production", accessToken: "production-token" }, { request: async () => new Response(null, { status: 200 }) });
    await expect(driver.deliver({ notificationId: "n1", destination: "U1", message: "hello" })).resolves.toMatchObject({ provider: "line-messaging-api" });
  });

  it("rejects attempts to force a fake LINE driver in Production", () => {
    expect(() => createLineDriver({ environment: "production", accessToken: "production-token", useFake: true })).toThrow("PRODUCTION_FAKE_DRIVER_FORBIDDEN");
  });

  it("keeps the deterministic fake LINE driver available outside Production", async () => {
    const driver = createLineDriver({ environment: "development", accessToken: "", useFake: true });
    await expect(driver.deliver({ notificationId: "n1" })).resolves.toMatchObject({ provider: "fake-line-development" });
  });

  it("disables email delivery explicitly in Production", async () => {
    const driver = createEmailDriver("production");
    await expect(driver.deliver({ notificationId: "n1" })).rejects.toThrow("EMAIL_DELIVERY_DISABLED");
  });
});
