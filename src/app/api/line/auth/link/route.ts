import { NextResponse } from "next/server";
import { z } from "zod";
import { completeLineLink } from "@/features/line/link-service";
import { getLineServerConfig } from "@/features/line/server-config";
import { verifyLineIdToken } from "@/features/line/verification";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  idToken: z.string().min(20).max(8192),
  challenge: z.string().min(20).max(200),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await request.json()); }
  catch { return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 }); }
  const config = getLineServerConfig();
  const admin = createAdminClient();
  const result = await completeLineLink(
    {
      userId: user.id,
      recentAuth: Boolean(user.last_sign_in_at && Date.now() - Date.parse(user.last_sign_in_at) <= 10 * 60_000),
      consent: body.consent,
      rawToken: body.idToken,
      challenge: body.challenge,
    },
    {
      verify: (token, channelId) => verifyLineIdToken(token, { channelId }),
      consumeAndLink: async (values) => {
        const { data, error } = await admin.rpc("create_line_link_server", {
          target_user_id: values.userId,
          target_provider_id: values.providerId,
          target_environment: values.environment,
          target_subject_hash: values.subjectHash,
          target_subject_ciphertext: values.subjectCiphertext,
          target_challenge_hash: values.challengeHash,
        });
        if (error || typeof data !== "string") throw new Error("LINE_LINK_CONFLICT");
        return data;
      },
    },
    { providerId: config.providerId, environment: config.environment, channelId: config.loginChannelId, hashKey: config.hashKey, encryptionKey: config.encryptionKey },
  ).catch(() => ({ ok: false as const, code: "LINE_LINK_CONFLICT" as const }));
  return NextResponse.json(result, { status: result.ok ? 200 : 409, headers: { "Cache-Control": "no-store" } });
}
