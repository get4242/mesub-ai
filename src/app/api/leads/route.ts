import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseLeadCapture } from "@/features/leads/capture";

const MAX_BODY_BYTES = 12_000;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return NextResponse.json({ accepted: false, code: "INVALID_REQUEST" }, { status: 400 });
  let input;
  try { input = parseLeadCapture(await request.json()); }
  catch { return NextResponse.json({ accepted: false, code: "INVALID_REQUEST" }, { status: 400 }); }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rateKey = `${forwarded || "unknown"}:${request.headers.get("user-agent")?.slice(0, 120) || "unknown"}`;
  const client = createAdminClient();
  const { data, error } = await client.rpc("capture_public_lead", {
    requested_kind: input.kind,
    requested_property_id: input.kind === "property" ? input.propertyId : null,
    requester_name: input.name,
    requester_email: input.email ?? "",
    requester_phone: input.phone ?? "",
    requester_message: input.message,
    requested_consent_version: input.consentVersion,
    request_idempotency_key: input.idempotencyKey,
    request_rate_key: rateKey
  });
  if (error) return NextResponse.json({ accepted: false, code: "UNAVAILABLE" }, { status: 503 });
  const outcome = (data as { outcome?: string } | null)?.outcome;
  if (outcome === "rate_limited") return NextResponse.json({ accepted: false, code: "RATE_LIMITED" }, { status: 429 });
  if (outcome === "invalid") return NextResponse.json({ accepted: false, code: "INVALID_REQUEST" }, { status: 400 });
  return NextResponse.json({ accepted: true }, { status: 202 });
}
