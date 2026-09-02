export type LineJobState =
  "queued" | "running" | "completed" | "ignored" | "dead_letter";

export function nextLineJobState(
  state: LineJobState,
  event: "claim" | "success" | "ignore" | "transient_failure",
  attempt: number,
  maxAttempts: number,
): LineJobState {
  if (state === "queued" && event === "claim") return "running";
  if (state === "running" && event === "success") return "completed";
  if (state === "running" && event === "ignore") return "ignored";
  if (state === "running" && event === "transient_failure")
    return attempt >= maxAttempts ? "dead_letter" : "queued";
  return state;
}

export function routeLineEvent(input: {
  type: string;
  text?: string;
  propertyId: string | null;
  consent: boolean;
}) {
  if (!input.consent) return { kind: "consent_required" as const };
  if (input.propertyId)
    return {
      kind: "property" as const,
      route: "canonical_property_owner" as const,
      propertyId: input.propertyId,
    };
  return { kind: "general" as const, route: "platform_intake" as const };
}
