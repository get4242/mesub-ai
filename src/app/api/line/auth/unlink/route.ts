import { NextResponse } from "next/server";
import { getLineServerConfig } from "@/features/line/server-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  if (!user.last_sign_in_at || Date.now() - Date.parse(user.last_sign_in_at) > 10 * 60_000) {
    return NextResponse.json({ code: "RECENT_AUTH_REQUIRED" }, { status: 403 });
  }
  const config = getLineServerConfig();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("revoke_line_link_server", {
    target_user_id: user.id,
    target_provider_id: config.providerId,
  });
  if (error) return NextResponse.json({ code: "UNLINK_FAILED" }, { status: 409 });
  await auth.auth.signOut({ scope: "local" });
  return NextResponse.json({ ok: Boolean(data) }, { headers: { "Cache-Control": "no-store" } });
}
