import { describe, expect, it, vi } from "vitest";
import { createPostgresAiJobDispatcher } from "./postgres-ai-job-dispatcher";

describe("AI job dispatcher contract", () => {
  it("enqueues only ID and correlation metadata", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 12, error: null });
    const dispatcher = createPostgresAiJobDispatcher(rpc);
    await expect(dispatcher.enqueue({ runId: "run", tenantId: "tenant", traceId: "trace", schemaVersion: 1 })).resolves.toEqual({ accepted: true });
    expect(rpc).toHaveBeenCalledWith("enqueue_ai_run_server", { run_id: "run", tenant_id: "tenant", trace_id: "trace", schema_version: 1 });
  });

  it("rejects additional payload fields and surfaces enqueue errors", async () => {
    const dispatcher = createPostgresAiJobDispatcher(async () => ({ data: null, error: new Error("offline") }));
    await expect(dispatcher.enqueue({ runId: "run", tenantId: "tenant", traceId: "trace", schemaVersion: 1, prompt: "secret" } as never)).rejects.toThrow("INVALID_QUEUE_MESSAGE");
    await expect(dispatcher.enqueue({ runId: "run", tenantId: "tenant", traceId: "trace", schemaVersion: 1 })).rejects.toThrow("QUEUE_UNAVAILABLE");
  });
});
