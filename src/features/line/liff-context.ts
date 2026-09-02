export type LiffState = "loading" | "error" | "external-browser" | "line-login-required" | "ready";
export function deriveLiffState(input: { sdkReady: boolean; inClient: boolean; loggedIn: boolean; failed?: boolean }): LiffState {
  if (input.failed) return "error";
  if (!input.sdkReady) return "loading";
  if (!input.inClient) return "external-browser";
  if (!input.loggedIn) return "line-login-required";
  return "ready";
}
