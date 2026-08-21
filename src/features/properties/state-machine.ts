export type PropertyStatus = "draft" | "pending_confirmation" | "published" | "sold" | "inactive" | "archived";

const phase1Transitions = new Set([
  "draft:pending_confirmation",
  "pending_confirmation:draft",
  "draft:archived",
  "pending_confirmation:archived"
]);

export function assertPhase1Transition(from: string, to: string): void {
  if (to === "published") throw new Error("PUBLISH_NOT_AVAILABLE_IN_PHASE_1");
  if (!phase1Transitions.has(`${from}:${to}`)) throw new Error("INVALID_TRANSITION");
}
