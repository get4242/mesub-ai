const allowedKeys = new Set(["requestId", "source", "reasonCode", "previousStatus", "nextStatus"]);

export function safeAuditMetadata(input: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => allowedKeys.has(key) && typeof value === "string" && value.length > 0 && value.length <= 200
    ) as [string, string][]
  );
}
