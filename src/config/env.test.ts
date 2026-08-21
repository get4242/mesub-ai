import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv } from "./env";

describe("environment contracts", () => {
  it("accepts only the browser-safe Supabase configuration in public env", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example"
      })
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example"
    });
  });

  it("rejects a public Supabase key that looks like a secret key", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_must-not-be-public"
      })
    ).toThrow(/secret/i);
  });

  it("requires all server-only provider secrets", () => {
    expect(() => parseServerEnv({ APP_ENV: "production", APP_REGION: "sin1", LOG_LEVEL: "info" })).toThrow();
  });
});
