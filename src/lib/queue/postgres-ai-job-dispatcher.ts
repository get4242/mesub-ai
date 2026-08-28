import { aiJobMessageSchema, type AiJobDispatcher } from "./ai-job-dispatcher";

type Rpc = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
export function createPostgresAiJobDispatcher(rpc: Rpc): AiJobDispatcher {
  return { async enqueue(input) {
    const parsed = aiJobMessageSchema.safeParse(input);
    if (!parsed.success) throw new Error("INVALID_QUEUE_MESSAGE");
    const { runId, tenantId, traceId, schemaVersion } = parsed.data;
    const result = await rpc("enqueue_ai_run_server", { run_id: runId, tenant_id: tenantId, trace_id: traceId, schema_version: schemaVersion });
    if (result.error) throw new Error("QUEUE_UNAVAILABLE");
    return { accepted: true };
  }};
}
