import { z } from "zod";

const password = z.string().min(12).max(128);

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password
});

export const signupSchema = loginSchema.extend({
  displayName: z.string().trim().min(1).max(120)
});

export type AuthActionResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_INPUT" | "INVALID_CREDENTIALS" | "EMAIL_UNVERIFIED" | "AUTH_UNAVAILABLE";
      message: string;
    };
