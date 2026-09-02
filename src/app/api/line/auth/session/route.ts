import { NextResponse } from "next/server";
import { z } from "zod";
import { getLineServerConfig } from "@/features/line/server-config";
import { normalizeReturnPath, resolveLineSession } from "@/features/line/session";
import { verifyLineIdToken } from "@/features/line/verification";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ idToken: z.string().min(20).max(8192), returnTo: z.string().max(300).optional() });

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await request.json()); }
  catch { return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 }); }
  const config = getLineServerConfig();
  const verified = await verifyLineIdToken(body.idToken, { channelId: config.loginChannelId });
  if (!verified.ok) return NextResponse.json(verified, { status: 401 });
  const admin = createAdminClient();
  const resolved = await resolveLineSession(
    { verifiedSubject: verified.subject, providerId: config.providerId, environment: config.environment, hashKey: config.hashKey },
    {
      findActiveUser: async (providerId, environment, subjectHash) => {
        const { data } = await admin.from("line_identity_links").select("user_id")
          .eq("provider_id", providerId).eq("environment", environment).eq("subject_hash", subjectHash)
          .is("revoked_at", null).maybeSingle();
        return data?.user_id ?? null;
      },
    },
  );
  if (!resolved.ok) return NextResponse.json(resolved, { status: 403 });
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(resolved.userId);
  const email = userData.user?.email;
  if (userError || !email) return NextResponse.json({ code: "LINE_SESSION_UNAVAILABLE" }, { status: 503 });
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) return NextResponse.json({ code: "LINE_SESSION_UNAVAILABLE" }, { status: 503 });
  const auth = await createClient();
  const { error: verifyError } = await auth.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "email" });
  if (verifyError) return NextResponse.json({ code: "LINE_SESSION_UNAVAILABLE" }, { status: 503 });
  return NextResponse.json({ ok: true, returnTo: normalizeReturnPath(body.returnTo) }, { headers: { "Cache-Control": "no-store" } });
}
