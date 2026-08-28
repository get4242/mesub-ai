export type DeliveryState = "queued" | "running" | "delivered" | "dead_letter";
export type DeliveryEvent = "claim" | "deliver" | "transient_failure";

export function nextDeliveryState(state: DeliveryState, event: DeliveryEvent, attempt: number, maxAttempts: number): DeliveryState {
  if (state === "delivered" || state === "dead_letter") throw new Error("INVALID_DELIVERY_TRANSITION");
  if (state === "queued" && event === "claim") return "running";
  if (state === "running" && event === "deliver") return "delivered";
  if (state === "running" && event === "transient_failure") return attempt >= maxAttempts ? "dead_letter" : "queued";
  throw new Error("INVALID_DELIVERY_TRANSITION");
}
