import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ enabled: z.boolean() }).strict();

export async function POST(request: Request) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  let enabled: boolean;
  try { enabled = bodySchema.parse(await request.json()).enabled; }
  catch { return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 }); }
  const admin = createAdminClient();
  const { data: activeLink } = await admin.from("line_identity_links").select("id")
    .eq("user_id", user.id).is("revoked_at", null).maybeSingle();
  if (enabled && !activeLink) return NextResponse.json({ code: "LINE_LINK_REQUIRED" }, { status: 409 });
  const now = new Date().toISOString();
  const { error } = await admin.from("line_notification_consents").upsert({
    user_id: user.id, enabled,
    consent_version: enabled ? "line-notification-v1" : null,
    consented_at: enabled ? now : null,
    revoked_at: enabled ? null : now,
    updated_at: now,
  });
  if (error) return NextResponse.json({ code: "CONSENT_UNAVAILABLE" }, { status: 503 });
  await admin.from("line_audit_events").insert({
    user_id: user.id,
    event_type: enabled ? "line_notification_consent_enabled" : "line_notification_consent_revoked",
    line_link_id: activeLink?.id ?? null,
  });
  return NextResponse.json({ ok: true, enabled }, { headers: { "Cache-Control": "no-store" } });
}
