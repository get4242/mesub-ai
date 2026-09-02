export type LinkAttempt = {
  recentAuth: boolean;
  consent: boolean;
  verifiedSubject: string;
  challengeExpiresAt: number;
  challengeConsumed: boolean;
};

export function validateLinkAttempt(input: LinkAttempt) {
  const allowed =
    input.recentAuth &&
    input.consent &&
    input.verifiedSubject.length > 0 &&
    input.challengeExpiresAt > Date.now() &&
    !input.challengeConsumed;
  return allowed
    ? { ok: true as const }
    : { ok: false as const, code: "LINK_NOT_ALLOWED" as const };
}
