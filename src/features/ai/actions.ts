"use server";
import { revalidatePath } from "next/cache";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPostgresAiJobDispatcher } from "@/lib/queue/postgres-ai-job-dispatcher";
import { startAiIntake, decideSuggestion } from "./action-logic";
import { parseAiRuntimeLimits } from "@/config/ai-runtime";

export async function startAiIntakeAction(input: Record<string, unknown>) {
  const context = await requireAgentContext();
  const client = await createClient();
  const admin = createAdminClient();
  const limits = parseAiRuntimeLimits(process.env);
  const repository = {
    async getProperty(id: string, tenantId: string) {
      const { data } = await client
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data
        ? {
            ...data,
            tenantId: data.tenant_id,
            criticalVersion: data.critical_version,
          }
        : null;
    },
    async getMedia(ids: string[], tenantId: string, propertyId: string) {
      if (!ids.length) return [];
      const { data } = await client
        .from("property_media")
        .select("id,tenant_id,property_id,status,checksum_sha256")
        .eq("tenant_id", tenantId)
        .eq("property_id", propertyId)
        .eq("status", "ready")
        .in("id", ids);
      return (data ?? []).map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        propertyId: row.property_id,
        status: row.status,
        checksumSha256: row.checksum_sha256,
      }));
    },
    async getOrCreateRun(value: Record<string, unknown>) {
      const traceId = crypto.randomUUID();
      const snapshot = value.snapshot as { property: { version: number } };
      const tasks = value.tasks as string[];
      const { data, error } = await admin.rpc("admit_ai_run_server", {
        target_tenant_id: value.tenantId,
        target_property_id: value.propertyId,
        target_requested_by_user_id: value.requesterUserId,
        target_idempotency_key: value.idempotencyKey,
        target_input_snapshot: value.snapshot,
        target_input_property_version: snapshot.property.version,
        target_tasks: tasks,
        target_model_profile_key: tasks[0],
        target_trace_id: traceId,
        max_attempts: limits.maxAttempts,
        max_concurrent_runs_per_tenant: limits.maxConcurrentRunsPerTenant,
        max_runs_per_tenant_per_day: limits.maxRunsPerTenantPerDay,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      return {
        id: result?.id ?? null,
        traceId: result?.trace_id ?? null,
        created: result?.status === "created",
        status: result?.status,
        queuedAtomically: true,
      };
    },
  };
  const result = await startAiIntake(
    input,
    context,
    repository,
    createPostgresAiJobDispatcher(
      async (name, args) => await admin.rpc(name, args),
    ),
    { maxTextCharacters: limits.maxTextCharacters, maxImages: limits.maxImages },
  );
  if (result.ok)
    revalidatePath(`/dashboard/properties/${String(input.propertyId)}/ai`);
  return result;
}
export async function acceptAiSuggestionAction(input: {
  suggestionId: string;
  expectedPropertyVersion: number;
}) {
  const client = await createClient();
  const result = await decideSuggestion("accept", input, async (_, v) => {
    const { error } = await client.rpc("accept_ai_suggestion", {
      target_suggestion_id: v.suggestionId,
      expected_property_version: v.expectedPropertyVersion,
    });
    if (error) throw error;
  });
  return result;
}
export async function rejectAiSuggestionAction(input: {
  suggestionId: string;
}) {
  const client = await createClient();
  return decideSuggestion("reject", input, async (_, v) => {
    const { error } = await client.rpc("reject_ai_suggestion", {
      target_suggestion_id: v.suggestionId,
    });
    if (error) throw error;
  });
}
export async function confirmPropertyAction(input: {
  propertyId: string;
  expectedVersion: number;
  expectedCriticalVersion: number;
  reviewRunId: string | null;
}) {
  const client = await createClient();
  const { data, error } = await client.rpc("confirm_property_current_version", {
    target_property_id: input.propertyId,
    expected_property_version: input.expectedVersion,
    expected_critical_version: input.expectedCriticalVersion,
    review_run_id: input.reviewRunId,
  });
  if (error)
    return {
      ok: false as const,
      code: error.message.includes("VERSION_CONFLICT")
        ? ("VERSION_CONFLICT" as const)
        : ("NOT_FOUND" as const),
    };
  return { ok: true as const, data: { confirmationId: data } };
}

export async function retryAiRunAction(input: { runId: string }) {
  const context = await requireAgentContext();
  const admin = createAdminClient();
  const { data: run } = await admin
    .from("ai_runs")
    .select("id,tenant_id,trace_id,state,retryable")
    .eq("id", input.runId)
    .eq("tenant_id", context.tenantId)
    .maybeSingle();
  if (!run) return { ok: false as const, code: "NOT_FOUND" as const };
  if (!run.retryable || !["failed", "dead_letter"].includes(run.state))
    return { ok: false as const, code: "RUN_NOT_RETRYABLE" as const };
  const { error } = await admin
    .from("ai_runs")
    .update({
      state: "queued",
      retryable: false,
      next_attempt_at: null,
      finished_at: null,
      error_category: null,
    })
    .eq("id", run.id)
    .eq("tenant_id", context.tenantId);
  if (error)
    return { ok: false as const, code: "SERVICE_UNAVAILABLE" as const };
  try {
    await createPostgresAiJobDispatcher(
      async (name, args) => await admin.rpc(name, args),
    ).enqueue({
      runId: run.id,
      tenantId: context.tenantId,
      traceId: run.trace_id,
      schemaVersion: 1,
    });
  } catch {
    return { ok: false as const, code: "SERVICE_UNAVAILABLE" as const };
  }
  revalidatePath(`/dashboard/properties`);
  return { ok: true as const, data: { runId: run.id } };
}
