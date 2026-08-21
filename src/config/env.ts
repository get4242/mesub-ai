import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1)
    .refine((value) => !value.toLowerCase().includes("secret") && !value.toLowerCase().includes("service_role"), {
      message: "A Supabase secret/service-role key must never be public"
    })
});

const serverEnvSchema = z.object({
  APP_ENV: z.enum(["local", "preview", "staging", "production"]),
  APP_REGION: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
  SUPABASE_SECRET_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  LINE_CHANNEL_SECRET: z.string().min(1),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1)
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parsePublicEnv(input: Record<string, string | undefined>): PublicEnv {
  return publicEnvSchema.parse(input);
}

export function parseServerEnv(input: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse(input);
}
