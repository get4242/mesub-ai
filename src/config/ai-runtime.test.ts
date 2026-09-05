import { describe, expect, it } from "vitest";
import { parseAiRuntimeLimits } from "./ai-runtime";

describe("AI runtime limits", () => {
  it("parses bounded operational limits", () => {
    expect(parseAiRuntimeLimits({
      AI_TIMEOUT_MS: "30000", AI_MAX_ATTEMPTS: "3", AI_MAX_TEXT_CHARACTERS: "12000",
      AI_MAX_IMAGES: "10", AI_MAX_CONTENT_CHARACTERS: "5000",
      AI_MAX_CONCURRENT_RUNS_PER_TENANT: "1", AI_MAX_RUNS_PER_TENANT_PER_DAY: "10"
    })).toEqual({ timeoutMs: 30000, maxAttempts: 3, maxTextCharacters: 12000, maxImages: 10, maxContentCharacters: 5000, maxConcurrentRunsPerTenant: 1, maxRunsPerTenantPerDay: 10 });
  });

  it("fails closed for excessive or missing values", () => {
    expect(() => parseAiRuntimeLimits({ AI_TIMEOUT_MS: "999999" })).toThrow();
  });
});
