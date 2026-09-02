import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const eventSchema = z
  .object({
    webhookEventId: z.string().min(1).max(200),
    type: z.string().min(1).max(60),
    timestamp: z.number().int().nonnegative(),
    deliveryContext: z.object({ isRedelivery: z.boolean() }).optional(),
    message: z
      .object({
        type: z.string().max(40),
        id: z.string().max(200),
        text: z.string().max(2000).optional(),
      })
      .optional(),
  })
  .passthrough();
const envelopeSchema = z.object({ events: z.array(eventSchema).max(100) });

export function verifyLineWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
) {
  if (!signature || !secret || rawBody.length > 1024 * 1024) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export function normalizeLineWebhook(rawBody: string) {
  const parsed = envelopeSchema.parse(JSON.parse(rawBody));
  return parsed.events.map((event) => ({
    eventId: event.webhookEventId,
    type: event.type,
    timestamp: event.timestamp,
    isRedelivery: event.deliveryContext?.isRedelivery ?? false,
    ...(event.message
      ? {
          messageType: event.message.type,
          messageId: event.message.id,
          ...(event.message.text ? { text: event.message.text } : {}),
        }
      : {}),
  }));
}
