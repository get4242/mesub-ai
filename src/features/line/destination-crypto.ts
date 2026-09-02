import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
function deriveKey(secret: string) {
  if (secret.length < 32) throw new Error("LINE_DESTINATION_ENCRYPTION_KEY_INVALID");
  return createHash("sha256").update(secret, "utf8").digest();
}
export function encryptLineDestination(subject: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(subject, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function decryptLineDestination(value: string, secret: string) {
  const payload = Buffer.from(value, "base64url");
  if (payload.length < 29) throw new Error("LINE_DESTINATION_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
}
