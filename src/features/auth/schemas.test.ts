import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "./schemas";

describe("auth schemas", () => {
  it("rejects malformed email and short password", () => {
    expect(loginSchema.safeParse({ email: "not-email", password: "short" }).success).toBe(false);
  });

  it("accepts a valid signup and trims its display name", () => {
    const parsed = signupSchema.parse({
      displayName: "  นายหน้าทดสอบ  ",
      email: "agent@example.com",
      password: "Secure-passphrase-123"
    });
    expect(parsed.displayName).toBe("นายหน้าทดสอบ");
  });
});
