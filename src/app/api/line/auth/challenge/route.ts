import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0;
  if (Date.now() - lastSignIn > 10 * 60_000) {
    return NextResponse.json({ code: "RECENT_AUTH_REQUIRED" }, { status: 403 });
  }
  const challenge = randomBytes(32).toString("base64url");
  const challengeHash = createHash("sha256").update(challenge, "utf8").digest("hex");
  const admin = createAdminClient();
  const { error } = await admin.from("line_link_challenges").insert({
    user_id: user.id,
    challenge_hash: challengeHash,
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  });
  if (error) return NextResponse.json({ code: "CHALLENGE_UNAVAILABLE" }, { status: 503 });
  return NextResponse.json({ challenge, expiresInSeconds: 300 }, { headers: { "Cache-Control": "no-store" } });
}
