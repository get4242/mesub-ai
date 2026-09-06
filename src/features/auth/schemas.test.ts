import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "./schemas";

describe("auth schemas", () => {
  it.each(["123456", "abcdef", "abc123"])("accepts a six-character password without composition rules: %s", (password) => {
    expect(loginSchema.safeParse({ email: "agent@example.com", password }).success).toBe(true);
  });

  it("rejects a five-character password", () => {
    expect(loginSchema.safeParse({ email: "agent@example.com", password: "12345" }).success).toBe(false);
  });

  it("trims and normalizes email before authentication", () => {
    const parsed = loginSchema.parse({ email: "  Agent@Example.COM  ", password: "123456" });
    expect(parsed.email).toBe("agent@example.com");
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
