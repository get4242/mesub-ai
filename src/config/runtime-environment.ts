import { z } from "zod";

export type AppEnvironment = "local" | "preview" | "staging" | "production";
export type LineEnvironment = "development" | "review" | "production";

const baseSchema = z.object({
  APP_ENV: z.enum(["local", "preview", "staging", "production"]),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1).refine(
    (value) => !/secret|service_role/i.test(value),
    "PUBLIC_SUPABASE_KEY_MUST_NOT_BE_SECRET",
  ),
  SUPABASE_SECRET_KEY: z.string().trim().min(1),
  SUPABASE_EXPECTED_PROJECT_REF: z.string().trim().min(1).optional(),
  OPENAI_API_KEY: z.string().trim().min(1),
  WORKER_TRIGGER_SECRET: z.string().min(32),
  LINE_ENVIRONMENT: z.enum(["development", "review", "production"]),
  LINE_PROVIDER_ID: z.string().trim().min(1),
  LINE_LOGIN_CHANNEL_ID: z.string().trim().min(1),
  LINE_MINI_APP_LIFF_ID: z.string().trim().min(1),
  LINE_MESSAGING_CHANNEL_SECRET: z.string().trim().min(1),
  LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: z.string().trim().min(1),
  LINE_IDENTITY_HASH_KEY: z.string().min(16),
  LINE_DESTINATION_ENCRYPTION_KEY: z.string().min(32),
  LINE_DEVELOPMENT_PROVIDER_ID: z.string().trim().min(1).optional(),
  LINE_DEVELOPMENT_LOGIN_CHANNEL_ID: z.string().trim().min(1).optional(),
  LINE_DEVELOPMENT_MINI_APP_LIFF_ID: z.string().trim().min(1).optional(),
});

function expectedLineEnvironment(appEnvironment: AppEnvironment): LineEnvironment {
  if (appEnvironment === "local") return "development";
  if (appEnvironment === "production") return "production";
  return "review";
}

function projectRefFromUrl(url: string): string {
  const hostname = new URL(url).hostname;
  const suffix = ".supabase.co";
  if (!hostname.endsWith(suffix)) throw new Error("SUPABASE_PROJECT_MISMATCH");
  return hostname.slice(0, -suffix.length);
}

export function parseRuntimeEnvironment(input: Record<string, string | undefined>) {
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) throw new Error("RUNTIME_CONFIGURATION_INVALID");
  const value = parsed.data;

  if (value.LINE_ENVIRONMENT !== expectedLineEnvironment(value.APP_ENV)) {
    throw new Error("ENVIRONMENT_MISMATCH");
  }

  const projectRef = projectRefFromUrl(value.NEXT_PUBLIC_SUPABASE_URL);
  if (value.APP_ENV === "production" && !value.SUPABASE_EXPECTED_PROJECT_REF) {
    throw new Error("RUNTIME_CONFIGURATION_INVALID");
  }
  if (value.SUPABASE_EXPECTED_PROJECT_REF && projectRef !== value.SUPABASE_EXPECTED_PROJECT_REF) {
    throw new Error("SUPABASE_PROJECT_MISMATCH");
  }

  if (value.APP_ENV === "production") {
    const developmentIdentifiers = [
      value.LINE_DEVELOPMENT_PROVIDER_ID,
      value.LINE_DEVELOPMENT_LOGIN_CHANNEL_ID,
      value.LINE_DEVELOPMENT_MINI_APP_LIFF_ID,
    ];
    if (developmentIdentifiers.some((identifier) => !identifier)) {
      throw new Error("RUNTIME_CONFIGURATION_INVALID");
    }
    const productionIdentifiers = [
      value.LINE_PROVIDER_ID,
      value.LINE_LOGIN_CHANNEL_ID,
      value.LINE_MINI_APP_LIFF_ID,
    ];
    if (productionIdentifiers.some((identifier, index) => identifier === developmentIdentifiers[index])) {
      throw new Error("DEVELOPMENT_IDENTIFIER_REUSE");
    }
  }

  return {
    appEnvironment: value.APP_ENV,
    supabase: {
      url: value.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      secretKey: value.SUPABASE_SECRET_KEY,
      projectRef,
    },
    openAiApiKey: value.OPENAI_API_KEY,
    workerTriggerSecret: value.WORKER_TRIGGER_SECRET,
    line: {
      environment: value.LINE_ENVIRONMENT,
      providerId: value.LINE_PROVIDER_ID,
      loginChannelId: value.LINE_LOGIN_CHANNEL_ID,
      liffId: value.LINE_MINI_APP_LIFF_ID,
      messagingSecret: value.LINE_MESSAGING_CHANNEL_SECRET,
      messagingAccessToken: value.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
      hashKey: value.LINE_IDENTITY_HASH_KEY,
      encryptionKey: value.LINE_DESTINATION_ENCRYPTION_KEY,
    },
    emailDelivery: "disabled" as const,
  };
}
