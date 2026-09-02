import { createAdminClient } from "@/lib/supabase/admin";
import { handleLineWebhook } from "@/features/line/webhook-handler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  const environment = process.env.LINE_ENVIRONMENT;
  if (!secret || (environment !== "development" && environment !== "review"))
    return Response.json({ accepted: false }, { status: 503 });
  const rawBody = await request.text();
  const admin = createAdminClient();
  const result = await handleLineWebhook(
    rawBody,
    request.headers.get("x-line-signature"),
    { secret, environment },
    {
      async accept(input) {
        const { data, error } = await admin.rpc("accept_line_webhook_server", {
          target_event_id: input.eventId,
          target_environment: input.environment,
          target_event_type: input.eventType,
          target_timestamp_ms: input.timestamp,
          target_payload: input.payload,
          target_retention_until: input.retentionUntil,
        });
        if (error) throw error;
        return Boolean(data);
      },
    },
  );
  return Response.json(
    { accepted: result.status === 200 },
    { status: result.status },
  );
}
