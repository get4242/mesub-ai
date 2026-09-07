import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema
} from "./schemas";

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

  it("normalizes the email used to request a password reset", () => {
    const parsed = forgotPasswordSchema.parse({ email: "  Agent@Example.COM  " });
    expect(parsed.email).toBe("agent@example.com");
  });

  it("accepts matching six-character passwords for recovery", () => {
    expect(resetPasswordSchema.safeParse({ password: "123456", confirmPassword: "123456" }).success).toBe(true);
  });

  it("rejects a recovery password shorter than six characters", () => {
    expect(resetPasswordSchema.safeParse({ password: "12345", confirmPassword: "12345" }).success).toBe(false);
  });

  it("rejects mismatched recovery passwords", () => {
    expect(resetPasswordSchema.safeParse({ password: "123456", confirmPassword: "654321" }).success).toBe(false);
  });

  it("requires the current password when changing a signed-in password", () => {
    expect(changePasswordSchema.safeParse({
      currentPassword: "",
      password: "abcdef",
      confirmPassword: "abcdef"
    }).success).toBe(false);
  });
});
