import { z } from "zod";

const runtimeSchema = z.object({
  AI_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000),
  AI_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5),
  AI_MAX_TEXT_CHARACTERS: z.coerce.number().int().min(1).max(50_000),
  AI_MAX_IMAGES: z.coerce.number().int().min(0).max(20),
  AI_MAX_CONTENT_CHARACTERS: z.coerce.number().int().min(1).max(20_000),
  AI_MAX_CONCURRENT_RUNS_PER_TENANT: z.coerce.number().int().min(1).max(10),
  AI_MAX_RUNS_PER_TENANT_PER_DAY: z.coerce.number().int().min(1).max(1_000)
});

export type AiRuntimeLimits = {
  timeoutMs: number; maxAttempts: number; maxTextCharacters: number; maxImages: number; maxContentCharacters: number;
  maxConcurrentRunsPerTenant: number; maxRunsPerTenantPerDay: number;
};

export function parseAiRuntimeLimits(input: Record<string, string | undefined>): AiRuntimeLimits {
  const value = runtimeSchema.parse(input);
  return {
    timeoutMs: value.AI_TIMEOUT_MS, maxAttempts: value.AI_MAX_ATTEMPTS,
    maxTextCharacters: value.AI_MAX_TEXT_CHARACTERS, maxImages: value.AI_MAX_IMAGES,
    maxContentCharacters: value.AI_MAX_CONTENT_CHARACTERS,
    maxConcurrentRunsPerTenant: value.AI_MAX_CONCURRENT_RUNS_PER_TENANT,
    maxRunsPerTenantPerDay: value.AI_MAX_RUNS_PER_TENANT_PER_DAY
  };
}
