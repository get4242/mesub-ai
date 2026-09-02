import { describe, expect, it } from "vitest";
import { validateLinkAttempt } from "./linking";

describe("LINE account linking", () => {
  it("requires recent auth, explicit consent, verified subject, and live one-time challenge", () => {
    expect(
      validateLinkAttempt({
        recentAuth: true,
        consent: true,
        verifiedSubject: "subject",
        challengeExpiresAt: Date.now() + 1000,
        challengeConsumed: false,
      }),
    ).toEqual({ ok: true });
    for (const input of [
      {
        recentAuth: false,
        consent: true,
        verifiedSubject: "s",
        challengeExpiresAt: Date.now() + 1000,
        challengeConsumed: false,
      },
      {
        recentAuth: true,
        consent: false,
        verifiedSubject: "s",
        challengeExpiresAt: Date.now() + 1000,
        challengeConsumed: false,
      },
      {
        recentAuth: true,
        consent: true,
        verifiedSubject: "",
        challengeExpiresAt: Date.now() + 1000,
        challengeConsumed: false,
      },
      {
        recentAuth: true,
        consent: true,
        verifiedSubject: "s",
        challengeExpiresAt: 1,
        challengeConsumed: false,
      },
      {
        recentAuth: true,
        consent: true,
        verifiedSubject: "s",
        challengeExpiresAt: Date.now() + 1000,
        challengeConsumed: true,
      },
    ])
      expect(validateLinkAttempt(input)).toEqual({
        ok: false,
        code: "LINK_NOT_ALLOWED",
      });
  });
});
