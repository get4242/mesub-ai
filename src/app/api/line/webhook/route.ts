import { createAdminClient } from "@/lib/supabase/admin";
import { handleLineWebhook } from "@/features/line/webhook-handler";
import { getLineServerConfig } from "@/features/line/server-config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let config: ReturnType<typeof getLineServerConfig>;
  try {
    config = getLineServerConfig();
  } catch {
    return Response.json({ accepted: false }, { status: 503 });
  }
  const rawBody = await request.text();
  const admin = createAdminClient();
  const result = await handleLineWebhook(
    rawBody,
    request.headers.get("x-line-signature"),
    { secret: config.messagingSecret, environment: config.environment },
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
