import "server-only";

type RequestLike = (url: string, init: RequestInit) => Promise<{ ok: boolean; json?: () => Promise<unknown> }>;
type VerifiedPayload = { sub?: unknown; aud?: unknown; exp?: unknown; nonce?: unknown };

export async function verifyLineIdToken(
  rawToken: string,
  expected: { channelId: string; nonce?: string },
  request: RequestLike = fetch,
) {
  if (!rawToken || !expected.channelId) return { ok: false as const, code: "INVALID_LINE_IDENTITY" as const };
  const body = new URLSearchParams({ id_token: rawToken, client_id: expected.channelId });
  if (expected.nonce) body.set("nonce", expected.nonce);
  let response: Awaited<ReturnType<RequestLike>>;
  try {
    response = await request("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch {
    return { ok: false as const, code: "LINE_UNAVAILABLE" as const };
  }
  if (!response.ok || !response.json) return { ok: false as const, code: "LINE_UNAVAILABLE" as const };
  const payload = (await response.json()) as VerifiedPayload;
  const valid =
    typeof payload.sub === "string" &&
    payload.sub.length > 0 &&
    payload.aud === expected.channelId &&
    (!expected.nonce || payload.nonce === expected.nonce) &&
    typeof payload.exp === "number" &&
    payload.exp > Math.floor(Date.now() / 1000);
  return valid
    ? { ok: true as const, subject: payload.sub as string }
    : { ok: false as const, code: "INVALID_LINE_IDENTITY" as const };
}
