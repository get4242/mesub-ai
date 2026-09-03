import { describe, expect, it, vi } from "vitest";
import { runWorkerCycle, type WorkerAdmin } from "./runtime";
import { parseRuntimeEnvironment } from "../../config/runtime-environment";

describe("bounded worker runtime composition", () => {
  it("polls each durable queue and acknowledges platform intake in one bounded cycle", async () => {
    const rpc = vi.fn(async (name: string) => ({
      data: name === "claim_platform_intake_server" ? [{ lead_id: "00000000-0000-4000-8000-000000000001" }] : [],
      error: null,
    }));
    const environment = parseRuntimeEnvironment({
      APP_ENV: "local",
      NEXT_PUBLIC_SUPABASE_URL: "https://devref.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_dev",
      SUPABASE_SECRET_KEY: "sb_secret_dev",
      OPENAI_API_KEY: "server-openai-key",
      WORKER_TRIGGER_SECRET: "worker-trigger-secret-at-least-32-characters",
      LINE_ENVIRONMENT: "development",
      LINE_PROVIDER_ID: "provider-dev",
      LINE_LOGIN_CHANNEL_ID: "login-dev",
      LINE_MINI_APP_LIFF_ID: "liff-dev",
      LINE_MESSAGING_CHANNEL_SECRET: "messaging-secret",
      LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: "messaging-token",
      LINE_IDENTITY_HASH_KEY: "identity-key-at-least-sixteen",
      LINE_DESTINATION_ENCRYPTION_KEY: "destination-key-at-least-thirty-two-characters",
    });

    await expect(runWorkerCycle({ rpc } as WorkerAdmin, environment, 999)).resolves.toEqual({
      ai: 0,
      lineWebhooks: 0,
      lineNotifications: 0,
      platformIntake: 1,
    });
    expect(rpc).toHaveBeenCalledWith("read_ai_jobs_server", expect.objectContaining({ batch_size: 10 }));
    expect(rpc).toHaveBeenCalledWith("read_line_jobs_server", expect.objectContaining({ batch_size: 10 }));
    expect(rpc).toHaveBeenCalledWith("read_line_notification_jobs_server", expect.objectContaining({ batch_size: 10 }));
  });
});
