import { normalizeLineWebhook, verifyLineWebhookSignature } from "./webhook";

export type LineWebhookRepository = {
  accept(input: {
    eventId: string;
    environment: "development" | "review" | "production";
    eventType: string;
    timestamp: number;
    payload: Record<string, unknown>;
    retentionUntil: string;
  }): Promise<boolean>;
};

export async function handleLineWebhook(
  rawBody: string,
  signature: string | null,
  config: { secret: string; environment: "development" | "review" | "production" },
  repository: LineWebhookRepository,
) {
  if (!verifyLineWebhookSignature(rawBody, signature, config.secret))
    return { status: 401, outcome: "rejected" as const };
  let events: ReturnType<typeof normalizeLineWebhook>;
  try {
    events = normalizeLineWebhook(rawBody);
  } catch {
    return { status: 400, outcome: "invalid" as const };
  }
  let accepted = false;
  for (const event of events) {
    const inserted = await repository.accept({
      eventId: event.eventId,
      environment: config.environment,
      eventType: event.type,
      timestamp: event.timestamp,
      payload: event,
      retentionUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    accepted ||= inserted;
  }
  return {
    status: 200,
    outcome: accepted ? ("accepted" as const) : ("duplicate" as const),
  };
}
