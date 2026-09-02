import { describe, expect, it } from "vitest";
import { decryptLineDestination, encryptLineDestination } from "./destination-crypto";
describe("LINE notification destination encryption", () => {
  it("round trips without exposing plaintext", () => {
    const key = "development-encryption-key-at-least-32-characters";
    const encrypted = encryptLineDestination("U123456789", key);
    expect(encrypted).not.toContain("U123456789");
    expect(decryptLineDestination(encrypted, key)).toBe("U123456789");
  });
  it("rejects tampering", () => {
    const key = "development-encryption-key-at-least-32-characters";
    const encrypted = encryptLineDestination("U123456789", key);
    expect(() => decryptLineDestination(encrypted.slice(0, -2) + "aa", key)).toThrow();
  });
});
