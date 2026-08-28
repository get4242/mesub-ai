import { z } from "zod";

const aiModelProfileEnvSchema = z.object({
  OPENAI_MODEL_EXTRACTION: z.string().trim().min(1),
  OPENAI_MODEL_VISION: z.string().trim().min(1),
  OPENAI_MODEL_LINE_CONVERSATION: z.string().trim().min(1),
  OPENAI_MODEL_CONTENT: z.string().trim().min(1),
  OPENAI_MODEL_FALLBACK: z.string().trim().min(1)
});

export type AiModelProfiles = {
  extraction: string;
  vision: string;
  lineConversation: string;
  content: string;
  fallback: string;
};

export type Phase2AiTask = "extraction" | "vision" | "content" | "fallback";

export function parseAiModelProfiles(input: Record<string, string | undefined>): AiModelProfiles {
  const env = aiModelProfileEnvSchema.parse(input);

  return {
    extraction: env.OPENAI_MODEL_EXTRACTION,
    vision: env.OPENAI_MODEL_VISION,
    lineConversation: env.OPENAI_MODEL_LINE_CONVERSATION,
    content: env.OPENAI_MODEL_CONTENT,
    fallback: env.OPENAI_MODEL_FALLBACK
  };
}

export function resolveAiModelProfile(profiles: AiModelProfiles, task: Phase2AiTask): string {
  return profiles[task];
}
