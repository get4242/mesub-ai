import { describe, expect, it } from "vitest";
import { passwordRecoveryRedirectUrl, safeAuthNext } from "./recovery-routing";

describe("password recovery routing", () => {
  it("builds a production recovery callback without allowing an arbitrary destination", () => {
    expect(passwordRecoveryRedirectUrl("https://mesub-ai.vercel.app")).toBe(
      "https://mesub-ai.vercel.app/auth/callback?next=%2Freset-password"
    );
  });

  it("allows only dashboard and password recovery destinations", () => {
    expect(safeAuthNext("/reset-password")).toBe("/reset-password");
    expect(safeAuthNext("/dashboard/profile")).toBe("/dashboard/profile");
    expect(safeAuthNext("//attacker.example")).toBe("/dashboard");
    expect(safeAuthNext("https://attacker.example")).toBe("/dashboard");
  });
});
