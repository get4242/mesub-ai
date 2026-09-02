import { describe, expect, it, vi } from "vitest";
import { verifyLineIdToken } from "./verification";

describe("LINE token verification", () => {
  it("maps only a server-verified subject for the expected channel", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: "line-user",
          aud: "login-dev",
          exp: Math.floor(Date.now() / 1000) + 60,
          nonce: "nonce-a",
        }),
      });
    await expect(
      verifyLineIdToken(
        "raw-token",
        { channelId: "login-dev", nonce: "nonce-a" },
        request,
      ),
    ).resolves.toEqual({ ok: true, subject: "line-user" });
    expect(request).toHaveBeenCalledWith(
      "https://api.line.me/oauth2/v2.1/verify",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fails closed for wrong audience, nonce, expiry, or provider failure", async () => {
    for (const payload of [
      { sub: "u", aud: "wrong", exp: 9999999999, nonce: "n" },
      { sub: "u", aud: "c", exp: 9999999999, nonce: "wrong" },
      { sub: "u", aud: "c", exp: 1, nonce: "n" },
    ]) {
      const request = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => payload });
      await expect(
        verifyLineIdToken("token", { channelId: "c", nonce: "n" }, request),
      ).resolves.toEqual({ ok: false, code: "INVALID_LINE_IDENTITY" });
    }
    await expect(
      verifyLineIdToken(
        "token",
        { channelId: "c", nonce: "n" },
        vi.fn().mockResolvedValue({ ok: false }),
      ),
    ).resolves.toEqual({ ok: false, code: "LINE_UNAVAILABLE" });
  });
});
