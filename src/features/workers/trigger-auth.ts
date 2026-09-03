import { timingSafeEqual } from "node:crypto";

export function authorizeWorkerTrigger(authorization: string | undefined, configuredSecret: string | undefined): boolean {
  if (!configuredSecret || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(configuredSecret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}
