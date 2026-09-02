import { describe, expect, it } from "vitest";
import { completeLineLink } from "./link-service";

describe("explicit LINE account linking", () => {
  it("requires current user, recent auth, consent, valid challenge and verified token", async () => {
    const calls: string[] = [];
    const result = await completeLineLink(
      { userId: "user-1", recentAuth: true, consent: true, rawToken: "token", challenge: "challenge" },
      {
        verify: async () => ({ ok: true, subject: "subject" }),
        consumeAndLink: async () => { calls.push("linked"); return "link-1"; },
      },
      { providerId: "provider", environment: "development", channelId: "channel", hashKey: "development-secret-that-is-long", encryptionKey: "development-encryption-key-at-least-32-characters" },
    );
    expect(result).toEqual({ ok: true, linkId: "link-1" });
    expect(calls).toEqual(["linked"]);
  });

  it("never links when verification fails", async () => {
    let linked = false;
    const result = await completeLineLink(
      { userId: "user-1", recentAuth: true, consent: true, rawToken: "bad", challenge: "challenge" },
      {
        verify: async () => ({ ok: false, code: "INVALID_LINE_IDENTITY" }),
        consumeAndLink: async () => { linked = true; return "link"; },
      },
      { providerId: "provider", environment: "development", channelId: "channel", hashKey: "development-secret-that-is-long", encryptionKey: "development-encryption-key-at-least-32-characters" },
    );
    expect(result.ok).toBe(false);
    expect(linked).toBe(false);
  });
});
