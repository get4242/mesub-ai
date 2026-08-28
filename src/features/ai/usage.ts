export function normalizeAiUsage(usage?: { input_tokens?: number | null; output_tokens?: number | null }) {
  const measured = typeof usage?.input_tokens === "number" && typeof usage?.output_tokens === "number";
  return { inputTokens: measured ? usage.input_tokens! : null, outputTokens: measured ? usage.output_tokens! : null, measurementStatus: measured ? "measured" as const : "unknown" as const };
}
