import "server-only";

import { createHmac } from "node:crypto";

export function createSubjectHash(subject: string, key: string) {
  if (!subject || key.length < 16) throw new Error("LINE_IDENTITY_HASH_KEY_INVALID");
  return createHmac("sha256", key).update(subject, "utf8").digest("hex");
}

const SAFE_RETURN_PATHS = [
  /^\/dashboard$/,
  /^\/dashboard\/properties(?:\/new|\/[0-9a-f-]+(?:\/ai)?)?$/,
  /^\/dashboard\/leads$/,
  /^\/dashboard\/profile$/,
];

export function normalizeReturnPath(value: unknown) {
  if (typeof value !== "string" || !SAFE_RETURN_PATHS.some((pattern) => pattern.test(value))) return "/dashboard";
  return value;
}

export async function resolveLineSession(
  input: { verifiedSubject: string; providerId: string; environment: "development" | "review" | "production"; hashKey: string },
  repository: { findActiveUser(providerId: string, environment: string, subjectHash: string): Promise<string | null> },
) {
  const subjectHash = createSubjectHash(input.verifiedSubject, input.hashKey);
  const userId = await repository.findActiveUser(input.providerId, input.environment, subjectHash);
  return userId
    ? { ok: true as const, userId }
    : { ok: false as const, code: "LINE_ACCOUNT_NOT_LINKED" as const };
}
