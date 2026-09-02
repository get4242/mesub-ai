import "server-only";

import { parseLineEnvironment } from "./environment";

export function getLineServerConfig() {
  const env = parseLineEnvironment(process.env);
  if (env.environment === "production") throw new Error("LINE_PRODUCTION_FORBIDDEN");
  const hashKey = process.env.LINE_IDENTITY_HASH_KEY;
  const encryptionKey = process.env.LINE_DESTINATION_ENCRYPTION_KEY;
  if (!hashKey || hashKey.length < 16) throw new Error("LINE_IDENTITY_HASH_KEY_INVALID");
  if (!encryptionKey || encryptionKey.length < 32) throw new Error("LINE_DESTINATION_ENCRYPTION_KEY_INVALID");
  return {
    environment: env.environment as "development" | "review",
    providerId: env.LINE_PROVIDER_ID,
    loginChannelId: env.LINE_LOGIN_CHANNEL_ID,
    liffId: env.LINE_MINI_APP_LIFF_ID,
    messagingSecret: env.LINE_MESSAGING_CHANNEL_SECRET,
    messagingAccessToken: env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
    hashKey,
    encryptionKey,
  };
}
