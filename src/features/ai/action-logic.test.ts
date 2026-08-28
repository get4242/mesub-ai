import { describe, expect, it, vi } from "vitest";
import { startAiIntake, decideSuggestion } from "./action-logic";

const context = { userId: "user-a", tenantId: "tenant-a", agentProfileId: "agent-a" };
describe("AI action logic", () => {
  it("gets or creates one durable run then dispatches its ID only", async () => {
    const repository = { getProperty: vi.fn().mockResolvedValue({ id: "property-a", tenantId: "tenant-a", version: 2, title: "Home" }), getMedia: vi.fn().mockResolvedValue([]), getOrCreateRun: vi.fn().mockResolvedValue({ id: "run-a", traceId: "trace-a", created: true }) };
    const dispatcher = { enqueue: vi.fn().mockResolvedValue({ accepted: true }) };
    await expect(startAiIntake({ propertyId: "property-a", expectedVersion: 2, agentText: "details", mediaIds: [], tasks: ["extraction"], idempotencyKey: "key-a" }, context, repository, dispatcher)).resolves.toEqual({ ok: true, data: { runId: "run-a" } });
    expect(dispatcher.enqueue).toHaveBeenCalledWith({ runId: "run-a", tenantId: "tenant-a", traceId: "trace-a", schemaVersion: 1 });
  });
  it("maps cross-tenant absence without dispatch", async () => {
    const dispatcher = { enqueue: vi.fn() };
    const repository = { getProperty: vi.fn().mockResolvedValue(null), getMedia: vi.fn(), getOrCreateRun: vi.fn() };
    await expect(startAiIntake({ propertyId: "other", expectedVersion: 1, agentText: "x", mediaIds: [], tasks: ["extraction"], idempotencyKey: "key" }, context, repository, dispatcher)).resolves.toEqual({ ok: false, code: "NOT_FOUND" });
    expect(dispatcher.enqueue).not.toHaveBeenCalled();
  });
  it("maps stale and already decided suggestion results", async () => {
    await expect(decideSuggestion("accept", { suggestionId: "s", expectedPropertyVersion: 1 }, async () => { throw new Error("VERSION_CONFLICT"); })).resolves.toEqual({ ok: false, code: "VERSION_CONFLICT" });
  });
});
