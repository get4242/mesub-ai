import { validateAiOutput } from "../output-validator";
import type { AiProvider } from "../provider/provider";

type ClaimedRun = { id: string; attempt: number; snapshot: unknown; task: "extraction" | "vision" | "content" | "fallback"; model: string; sourceIds: string[] };
type Repository = { claim(id: string): Promise<ClaimedRun | null>; succeed(run: ClaimedRun, result: unknown, suggestions: unknown[]): Promise<void> | void; fail(run: ClaimedRun, error: { category: string; retryable: boolean; deadLetter: boolean }): Promise<void> | void };
export async function processAiRun(runId: string, dependencies: { repository: Repository; provider: AiProvider; maxAttempts: number; timeoutMs?: number }) {
  const run = await dependencies.repository.claim(runId);
  if (!run) return;
  try {
    const result = await dependencies.provider.generate({ model: run.model, task: run.task, snapshot: run.snapshot, timeoutMs: dependencies.timeoutMs ?? 30_000 });
    const validated = validateAiOutput(result.output, new Set(run.sourceIds));
    if (!validated.ok) { await dependencies.repository.fail(run, { category: validated.code, retryable: false, deadLetter: false }); return; }
    await dependencies.repository.succeed(run, result, validated.suggestions);
  } catch (error) {
    const retryable = error instanceof Error && (error.name === "AbortError" || /429|5\d\d|timeout/i.test(error.message));
    await dependencies.repository.fail(run, { category: retryable ? "PROVIDER_TRANSIENT" : "PROVIDER_PERMANENT", retryable, deadLetter: retryable && run.attempt >= dependencies.maxAttempts });
  }
}
