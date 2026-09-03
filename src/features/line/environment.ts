import { z } from "zod";

const schema = z.object({
  LINE_ENVIRONMENT: z.enum(["development", "review", "production"]),
  LINE_PROVIDER_ID: z.string().min(1),
  LINE_LOGIN_CHANNEL_ID: z.string().min(1),
  LINE_MINI_APP_LIFF_ID: z.string().min(1),
  LINE_MESSAGING_CHANNEL_SECRET: z.string().min(1),
  LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: z.string().min(1),
});

export function parseLineEnvironment(
  input: Record<string, string | undefined>,
) {
  const value = schema.parse(input);
  return {
    ...value,
    publicConfig: {
      environment: value.LINE_ENVIRONMENT,
      liffId: value.LINE_MINI_APP_LIFF_ID,
    },
    environment: value.LINE_ENVIRONMENT,
  };
}
