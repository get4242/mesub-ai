import { describe, expect, it } from "vitest";
import { parseRuntimeEnvironment } from "./runtime-environment";

describe("unified runtime environment", () => {
  const production = {
    APP_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://prodref.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_prod",
    SUPABASE_SECRET_KEY: "sb_secret_prod",
    SUPABASE_EXPECTED_PROJECT_REF: "prodref",
    OPENAI_API_KEY: "server-openai-key",
    WORKER_TRIGGER_SECRET: "worker-trigger-secret-at-least-32-characters",
    LINE_ENVIRONMENT: "production",
    LINE_PROVIDER_ID: "provider-prod",
    LINE_LOGIN_CHANNEL_ID: "login-prod",
    LINE_MINI_APP_LIFF_ID: "liff-prod",
    LINE_MESSAGING_CHANNEL_SECRET: "messaging-secret",
    LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: "messaging-token",
    LINE_IDENTITY_HASH_KEY: "identity-key-at-least-sixteen",
    LINE_DESTINATION_ENCRYPTION_KEY: "destination-key-at-least-thirty-two-characters",
    LINE_DEVELOPMENT_PROVIDER_ID: "provider-dev",
    LINE_DEVELOPMENT_LOGIN_CHANNEL_ID: "login-dev",
    LINE_DEVELOPMENT_MINI_APP_LIFF_ID: "liff-dev",
  };

  it("accepts a complete and isolated Production configuration", () => {
    const result = parseRuntimeEnvironment(production);
    expect(result.appEnvironment).toBe("production");
    expect(result.line.environment).toBe("production");
    expect(result.supabase.projectRef).toBe("prodref");
    expect(result.emailDelivery).toBe("disabled");
  });

  it("rejects incomplete Production configuration", () => {
    expect(() => parseRuntimeEnvironment({ ...production, LINE_MESSAGING_CHANNEL_SECRET: "" })).toThrow("RUNTIME_CONFIGURATION_INVALID");
  });

  it("rejects a missing protected worker trigger secret", () => {
    expect(() => parseRuntimeEnvironment({ ...production, WORKER_TRIGGER_SECRET: "" })).toThrow("RUNTIME_CONFIGURATION_INVALID");
  });

  it("rejects APP_ENV and LINE_ENVIRONMENT mismatch", () => {
    expect(() => parseRuntimeEnvironment({ ...production, LINE_ENVIRONMENT: "development" })).toThrow("ENVIRONMENT_MISMATCH");
  });

  it.each([
    ["LINE_PROVIDER_ID", "LINE_DEVELOPMENT_PROVIDER_ID"],
    ["LINE_LOGIN_CHANNEL_ID", "LINE_DEVELOPMENT_LOGIN_CHANNEL_ID"],
    ["LINE_MINI_APP_LIFF_ID", "LINE_DEVELOPMENT_MINI_APP_LIFF_ID"],
  ] as const)("rejects Production reuse of %s", (productionKey, developmentKey) => {
    expect(() => parseRuntimeEnvironment({ ...production, [productionKey]: production[developmentKey] })).toThrow("DEVELOPMENT_IDENTIFIER_REUSE");
  });

  it("rejects a Supabase URL that is not bound to the expected project", () => {
    expect(() => parseRuntimeEnvironment({ ...production, SUPABASE_EXPECTED_PROJECT_REF: "another-ref" })).toThrow("SUPABASE_PROJECT_MISMATCH");
  });

  it("keeps Development behavior without Production isolation references", () => {
    const result = parseRuntimeEnvironment({ ...production, APP_ENV: "local", LINE_ENVIRONMENT: "development", SUPABASE_EXPECTED_PROJECT_REF: undefined, LINE_DEVELOPMENT_PROVIDER_ID: undefined, LINE_DEVELOPMENT_LOGIN_CHANNEL_ID: undefined, LINE_DEVELOPMENT_MINI_APP_LIFF_ID: undefined });
    expect(result.line.environment).toBe("development");
  });
});
