import { describe, expect, it, vi } from "vitest";
import { processAiRun } from "./process-ai-run";

describe("processAiRun", () => {
  it("does not call the provider for duplicate terminal delivery", async () => {
    const provider = { generate: vi.fn() };
    const repository = { claim: vi.fn().mockResolvedValue(null), succeed: vi.fn(), fail: vi.fn() };
    await processAiRun("run", { repository, provider, maxAttempts: 3 });
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it("persists validated output and usage once for a claimed attempt", async () => {
    const provider = { generate: vi.fn().mockResolvedValue({ output: { schemaVersion: 1, suggestions: [] }, usage: { inputTokens: 10, outputTokens: 2 }, providerRequestId: "req", resolvedModelId: "configured" }) };
    const repository = { claim: vi.fn().mockResolvedValue({ id: "run", attempt: 1, snapshot: {}, task: "extraction", model: "configured", sourceIds: [] }), succeed: vi.fn(), fail: vi.fn() };
    await processAiRun("run", { repository, provider, maxAttempts: 3 });
    expect(repository.succeed).toHaveBeenCalledTimes(1);
    expect(repository.fail).not.toHaveBeenCalled();
  });
});
