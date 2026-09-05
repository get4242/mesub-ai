import "server-only";
import { z } from "zod";
import { processAiRun } from "../ai/worker/process-ai-run";
import { createOpenAiGateway } from "../ai/provider/openai-gateway";
import { processLineNotification } from "../line/process-notification";
import { decryptLineDestination } from "../line/destination-crypto";
import { createLineDriver } from "./runtime-drivers";
import type { parseRuntimeEnvironment } from "../../config/runtime-environment";
import { resolveAiModelProfile } from "../../config/ai-model-profiles";
import type { AiProvider } from "../ai/provider/provider";

type RuntimeEnvironment = ReturnType<typeof parseRuntimeEnvironment>;
type RpcResult = { data: unknown; error: { message: string } | null };
export type WorkerAdmin = { rpc(name: string, args?: Record<string, unknown>): Promise<RpcResult> };

const queueRowSchema = z.object({
  message_id: z.coerce.number().int(),
  read_count: z.coerce.number().int().nonnegative(),
  message: z.record(z.string(), z.unknown()),
});
const aiMessageSchema = z.object({ runId: z.uuid(), schemaVersion: z.literal(1) }).passthrough();
const lineMessageSchema = z.object({ eventId: z.string().min(1), schemaVersion: z.literal(1) }).strict();
const notificationMessageSchema = z.object({ notificationId: z.uuid(), schemaVersion: z.literal(1) }).strict();

async function rpc(admin: WorkerAdmin, name: string, args?: Record<string, unknown>) {
  const result = await admin.rpc(name, args);
  if (result.error) throw new Error(`WORKER_RPC_FAILED:${name}`);
  return result.data;
}

function firstRow(value: unknown): Record<string, unknown> | null {
  return Array.isArray(value) && value[0] && typeof value[0] === "object" ? value[0] as Record<string, unknown> : null;
}

export async function runWorkerCycle(
  admin: WorkerAdmin,
  environment: RuntimeEnvironment,
  batchSize = 5,
  dependencies: { provider?: AiProvider } = {},
) {
  const boundedBatch = Math.max(1, Math.min(batchSize, 10));
  const summary = { ai: 0, lineWebhooks: 0, lineNotifications: 0, platformIntake: 0 };

  const aiRows = z.array(queueRowSchema).parse(await rpc(admin, "read_ai_jobs_server", { visibility_timeout_seconds: 90, batch_size: boundedBatch }));
  for (const row of aiRows) {
    const message = aiMessageSchema.safeParse(row.message);
    if (!message.success) {
      await rpc(admin, "archive_ai_job_server", { message_id: row.message_id });
      continue;
    }
    let terminal = false;
    await processAiRun(message.data.runId, {
      provider: dependencies.provider ?? createOpenAiGateway(),
      maxAttempts: environment.ai.limits.maxAttempts,
      timeoutMs: environment.ai.limits.timeoutMs,
      maxContentCharacters: environment.ai.limits.maxContentCharacters,
      repository: {
        async claim(id) {
          const claimed = firstRow(await rpc(admin, "claim_ai_run_server", { target_run_id: id }));
          if (!claimed) return null;
          return {
            id: String(claimed.id),
            attempt: Number(claimed.attempt),
            snapshot: claimed.snapshot,
            task: String(claimed.task) as "extraction" | "vision" | "content" | "fallback",
            model: resolveAiModelProfile(environment.ai.models, String(claimed.task) as "extraction" | "vision" | "content" | "fallback"),
            sourceIds: Array.isArray(claimed.source_ids) ? claimed.source_ids.map(String) : [],
          };
        },
        async succeed(run, result, suggestions) {
          await rpc(admin, "complete_ai_run_server", {
            target_run_id: run.id,
            target_provider_request_id: result && typeof result === "object" && "providerRequestId" in result ? result.providerRequestId : null,
            target_resolved_model_id: result && typeof result === "object" && "resolvedModelId" in result ? result.resolvedModelId : run.model,
            target_input_tokens: result && typeof result === "object" && "usage" in result && result.usage && typeof result.usage === "object" && "inputTokens" in result.usage ? result.usage.inputTokens : null,
            target_output_tokens: result && typeof result === "object" && "usage" in result && result.usage && typeof result.usage === "object" && "outputTokens" in result.usage ? result.usage.outputTokens : null,
            target_suggestions: suggestions,
          });
          terminal = true;
        },
        async fail(run, error) {
          const state = await rpc(admin, "fail_ai_run_server", {
            target_run_id: run.id,
            target_error_category: error.category,
            target_retryable: error.retryable,
            target_dead_letter: error.deadLetter,
          });
          terminal = state !== "queued";
        },
      },
    });
    if (terminal) await rpc(admin, "archive_ai_job_server", { message_id: row.message_id });
    summary.ai += 1;
  }

  const lineRows = z.array(queueRowSchema).parse(await rpc(admin, "read_line_jobs_server", { visibility_timeout_seconds: 60, batch_size: boundedBatch }));
  for (const row of lineRows) {
    const message = lineMessageSchema.safeParse(row.message);
    if (!message.success) {
      await rpc(admin, "archive_line_job_server", { message_id: row.message_id });
      continue;
    }
    const claimed = firstRow(await rpc(admin, "claim_line_webhook_server", { target_event_id: message.data.eventId }));
    if (claimed) await rpc(admin, "complete_line_webhook_server", { target_event_id: message.data.eventId, target_ignored: claimed.event_type !== "message" });
    await rpc(admin, "archive_line_job_server", { message_id: row.message_id });
    summary.lineWebhooks += 1;
  }

  const notificationRows = z.array(queueRowSchema).parse(await rpc(admin, "read_line_notification_jobs_server", { visibility_timeout_seconds: 60, batch_size: boundedBatch }));
  const lineDriver = createLineDriver({ environment: environment.line.environment, accessToken: environment.line.messagingAccessToken });
  for (const row of notificationRows) {
    const message = notificationMessageSchema.safeParse(row.message);
    if (!message.success) continue;
    const result = await processLineNotification(message.data.notificationId, {
      async claim(id) {
        const claimed = firstRow(await rpc(admin, "claim_line_delivery_server", { target_delivery_id: id, target_cap: 20 }));
        if (!claimed) return null;
        return {
          notificationId: String(claimed.notification_id),
          destination: decryptLineDestination(String(claimed.destination), environment.line.encryptionKey),
          message: String(claimed.message),
          attempt: Number(claimed.attempt),
        };
      },
      async complete(id, provider, receiptId) {
        await rpc(admin, "complete_line_delivery_server", { target_delivery_id: id, target_provider: provider, target_receipt_id: receiptId });
      },
      async fail(id, safeErrorCode) {
        return await rpc(admin, "fail_line_delivery_server", { target_delivery_id: id, target_error_code: safeErrorCode }) as "queued" | "dead_letter" | "unchanged";
      },
    }, lineDriver);
    if (result.status !== "retry_scheduled") {
      await rpc(admin, "archive_line_notification_job_server", { message_id: row.message_id });
    }
    summary.lineNotifications += 1;
  }

  const intake = await rpc(admin, "claim_platform_intake_server", { batch_size: boundedBatch });
  summary.platformIntake = Array.isArray(intake) ? intake.length : 0;
  return summary;
}
