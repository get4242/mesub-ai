import { z } from "zod";

const password = z.string().min(6).max(128);
const email = z.string().trim().toLowerCase().pipe(z.email());

export const loginSchema = z.object({
  email,
  password
});

export const signupSchema = loginSchema.extend({
  displayName: z.string().trim().min(1).max(120)
});

export const forgotPasswordSchema = z.object({ email });

const passwordPair = z.object({
  password,
  confirmPassword: password
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match"
});

export const resetPasswordSchema = passwordPair;

export const changePasswordSchema = passwordPair.extend({
  currentPassword: password
});

export type AuthActionResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_INPUT" | "INVALID_CREDENTIALS" | "EMAIL_UNVERIFIED" | "AUTH_UNAVAILABLE" | "PASSWORD_UPDATE_FAILED";
      message: string;
    };
