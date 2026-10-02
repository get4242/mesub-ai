import { z } from "zod";
import type { parseRuntimeEnvironment } from "@/config/runtime-environment";
import type { WorkerAdmin } from "../workers/runtime";

export type LineRuntimeConfig = ReturnType<typeof parseRuntimeEnvironment>;
export const conversationEventSchema = z.object({
  eventId: z.string().min(1), type: z.string(),
  subjectHash: z.string().regex(/^[a-f0-9]{64}$/), destination: z.string().min(1),
  messageType: z.string().optional(), messageId: z.string().optional(),
  text: z.string().max(2000).optional(), postback: z.string().max(300).optional(),
  postbackParams: z.record(z.string(), z.string()).optional(),
  responseMessages: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
});
export type ConversationEvent = z.infer<typeof conversationEventSchema>;
export const conversationContextSchema = z.object({
  actor: z.object({ userId: z.uuid(), tenantId: z.uuid(), agentId: z.uuid(), slug: z.string() }).nullable(),
  propertyIds: z.array(z.uuid()).max(10),
});
export type ConversationContext = z.infer<typeof conversationContextSchema>;
export type LineActor = NonNullable<ConversationContext["actor"]>;

export function lineActorArgs(event: ConversationEvent, config: LineRuntimeConfig) {
  return { target_provider: config.line.providerId, target_environment: config.line.environment, target_subject_hash: event.subjectHash };
}
export async function lineRpc(admin: WorkerAdmin, name: string, args: Record<string, unknown>) {
  const result = await admin.rpc(name, args);
  if (result.error) throw new Error(`LINE_OPERATION_FAILED:${name}`);
  return result.data;
}
export function linePublicOrigin(input: Record<string, string | undefined> = process.env) {
  const value = input.NEXT_PUBLIC_SITE_URL ?? (input.VERCEL_PROJECT_PRODUCTION_URL ? `https://${input.VERCEL_PROJECT_PRODUCTION_URL}` : "https://mesub-ai.vercel.app");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("LINE_PUBLIC_ORIGIN_INVALID");
  return url.origin;
}
