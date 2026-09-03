import "server-only";

import { createHash } from "node:crypto";
import { validateLinkAttempt } from "./linking";
import { createSubjectHash } from "./session";
import { encryptLineDestination } from "./destination-crypto";

type VerifyResult = { ok: true; subject: string } | { ok: false; code: string };

export async function completeLineLink(
  input: { userId: string; recentAuth: boolean; consent: boolean; rawToken: string; challenge: string },
  dependencies: {
    verify(rawToken: string, channelId: string): Promise<VerifyResult>;
    consumeAndLink(values: { userId: string; providerId: string; environment: string; subjectHash: string; subjectCiphertext: string; challengeHash: string }): Promise<string>;
  },
  config: { providerId: string; environment: "development" | "review" | "production"; channelId: string; hashKey: string; encryptionKey: string },
) {
  if (!input.userId || !input.rawToken || !input.challenge || !input.recentAuth || !input.consent) {
    return { ok: false as const, code: "LINK_NOT_ALLOWED" as const };
  }
  const verified = await dependencies.verify(input.rawToken, config.channelId);
  if (!verified.ok) return verified;
  const allowed = validateLinkAttempt({
    recentAuth: input.recentAuth,
    consent: input.consent,
    verifiedSubject: verified.subject,
    challengeExpiresAt: Date.now() + 60_000,
    challengeConsumed: false,
  });
  if (!allowed.ok) return allowed;
  const linkId = await dependencies.consumeAndLink({
    userId: input.userId,
    providerId: config.providerId,
    environment: config.environment,
    subjectHash: createSubjectHash(verified.subject, config.hashKey),
    subjectCiphertext: encryptLineDestination(verified.subject, config.encryptionKey),
    challengeHash: createHash("sha256").update(input.challenge, "utf8").digest("hex"),
  });
  return { ok: true as const, linkId };
}
