import "server-only";

import { parseRuntimeEnvironment } from "@/config/runtime-environment";

export function getLineServerConfig(input: Record<string, string | undefined> = process.env) {
  const env = parseRuntimeEnvironment(input);
  return {
    environment: env.line.environment,
    providerId: env.line.providerId,
    loginChannelId: env.line.loginChannelId,
    liffId: env.line.liffId,
    messagingSecret: env.line.messagingSecret,
    messagingAccessToken: env.line.messagingAccessToken,
    hashKey: env.line.hashKey,
    encryptionKey: env.line.encryptionKey,
  };
}
