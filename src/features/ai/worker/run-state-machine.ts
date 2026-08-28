export type AiRunState = "queued" | "running" | "succeeded" | "failed" | "dead_letter" | "cancelled";
export type AiRunEvent = "claim" | "succeed" | "permanent_failure" | "transient_failure" | "cancel";
export function nextRunState(state: AiRunState, event: AiRunEvent, attempt: number, maxAttempts: number): AiRunState {
  if (state === "cancelled") return "cancelled";
  if (state === "succeeded" || state === "failed" || state === "dead_letter") throw new Error("INVALID_RUN_TRANSITION");
  if (event === "cancel") return "cancelled";
  if (state === "queued" && event === "claim") return "running";
  if (state === "running" && event === "succeed") return "succeeded";
  if (state === "running" && event === "permanent_failure") return "failed";
  if (state === "running" && event === "transient_failure") return attempt >= maxAttempts ? "dead_letter" : "queued";
  throw new Error("INVALID_RUN_TRANSITION");
}
