import { describe, expect, it, vi } from "vitest";
import { handleWorkerRequest } from "./worker-route";

describe("worker HTTP adapter", () => {
  it.each(["GET", "POST"])("runs the same bounded orchestration for authorized %s", async (method) => {
    const run = vi.fn(async () => ({ ai: 0, lineWebhooks: 0, lineNotifications: 0, platformIntake: 0 }));
    const response = await handleWorkerRequest(new Request("https://example.test/api/internal/workers", {
      method, headers: { authorization: "Bearer worker-secret" },
    }), { configuredSecret: "worker-secret", run });
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledOnce();
  });

  it.each(["GET", "POST"])("fails closed for unauthorized %s", async (method) => {
    const run = vi.fn();
    const response = await handleWorkerRequest(new Request("https://example.test/api/internal/workers", { method }), {
      configuredSecret: "worker-secret", run,
    });
    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });
});
