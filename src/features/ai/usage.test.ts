import { describe, expect, it } from "vitest";
import { normalizeAiUsage } from "./usage";

describe("AI usage normalization", () => {
  it("marks supplied counters measured and missing counters unknown", () => {
    expect(normalizeAiUsage({ input_tokens: 4, output_tokens: 2 })).toEqual({ inputTokens: 4, outputTokens: 2, measurementStatus: "measured" });
    expect(normalizeAiUsage(undefined)).toEqual({ inputTokens: null, outputTokens: null, measurementStatus: "unknown" });
  });
});
