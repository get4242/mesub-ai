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
      OPENAI_MODEL_EXTRACTION: "extract-model",
      OPENAI_MODEL_VISION: "vision-model",
      OPENAI_MODEL_LINE_CONVERSATION: "line-model",
      OPENAI_MODEL_CONTENT: "content-model",
      OPENAI_MODEL_FALLBACK: "fallback-model",
      AI_TIMEOUT_MS: "30000",
      AI_MAX_ATTEMPTS: "3",
      AI_MAX_TEXT_CHARACTERS: "12000",
      AI_MAX_IMAGES: "10",
      AI_MAX_CONTENT_CHARACTERS: "5000",
      AI_MAX_CONCURRENT_RUNS_PER_TENANT: "1",
      AI_MAX_RUNS_PER_TENANT_PER_DAY: "10",
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

  it("resolves the task profile and operational limits before calling OpenAI", async () => {
    const runId = "00000000-0000-4000-8000-000000000010";
    const sourceId = "00000000-0000-4000-8000-000000000011";
    const provider = { generate: vi.fn(async (request: { model: string }) => ({
      output: { schemaVersion: 1, suggestions: [{ fieldKey: "title", value: "บ้าน", confidence: 0.9, confidenceUnknown: false, sourceIds: [sourceId] }] },
      usage: { inputTokens: 1, outputTokens: 1, measurementStatus: "measured" as const }, providerRequestId: "request-1", resolvedModelId: request.model,
    })) };
    const rpc = vi.fn(async (name: string) => {
      if (name === "read_ai_jobs_server") return { data: [{ message_id: 1, read_count: 1, message: { runId, schemaVersion: 1 } }], error: null };
      if (name === "claim_ai_run_server") return { data: [{ id: runId, attempt: 1, snapshot: {}, task: "vision", model: "", source_ids: [sourceId] }], error: null };
      if (name === "complete_ai_run_server") return { data: true, error: null };
      if (name === "claim_platform_intake_server") return { data: [], error: null };
      return { data: [], error: null };
    });
    const environment = parseRuntimeEnvironment({
      APP_ENV: "local", NEXT_PUBLIC_SUPABASE_URL: "https://devref.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public",
      SUPABASE_SECRET_KEY: "secret", OPENAI_API_KEY: "openai", WORKER_TRIGGER_SECRET: "worker-trigger-secret-at-least-32-characters",
      OPENAI_MODEL_EXTRACTION: "extract-model", OPENAI_MODEL_VISION: "vision-model", OPENAI_MODEL_LINE_CONVERSATION: "line-model",
      OPENAI_MODEL_CONTENT: "content-model", OPENAI_MODEL_FALLBACK: "fallback-model", AI_TIMEOUT_MS: "17000", AI_MAX_ATTEMPTS: "2",
      AI_MAX_TEXT_CHARACTERS: "12000", AI_MAX_IMAGES: "10", AI_MAX_CONTENT_CHARACTERS: "5000",
      AI_MAX_CONCURRENT_RUNS_PER_TENANT: "1", AI_MAX_RUNS_PER_TENANT_PER_DAY: "10", LINE_ENVIRONMENT: "development",
      LINE_PROVIDER_ID: "provider", LINE_LOGIN_CHANNEL_ID: "login", LINE_MINI_APP_LIFF_ID: "liff", LINE_MESSAGING_CHANNEL_SECRET: "secret",
      LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: "token", LINE_IDENTITY_HASH_KEY: "identity-key-long", LINE_DESTINATION_ENCRYPTION_KEY: "destination-key-at-least-thirty-two-characters",
    });

    await runWorkerCycle({ rpc } as WorkerAdmin, environment, 5, { provider });

    expect(provider.generate).toHaveBeenCalledWith(expect.objectContaining({ model: "vision-model", timeoutMs: 17_000 }));
  });
});
