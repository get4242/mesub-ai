import { describe, expect, it } from "vitest";
import { deriveLiffState } from "./liff-context";

describe("LIFF context", () => {
  it("uses a friendly browser fallback outside LINE", () => {
    expect(deriveLiffState({ sdkReady: true, inClient: false, loggedIn: false })).toBe("external-browser");
  });
  it("requires LINE login before token exchange", () => {
    expect(deriveLiffState({ sdkReady: true, inClient: true, loggedIn: false })).toBe("line-login-required");
    expect(deriveLiffState({ sdkReady: true, inClient: true, loggedIn: true })).toBe("ready");
  });
  it("has explicit loading and error states", () => {
    expect(deriveLiffState({ sdkReady: false, inClient: false, loggedIn: false })).toBe("loading");
    expect(deriveLiffState({ sdkReady: false, inClient: false, loggedIn: false, failed: true })).toBe("error");
  });
});
