import { describe, expect, it } from "vitest";
import { parseLineEnvironment } from "./environment";

describe("LINE environment contract", () => {
  it("accepts a complete Development configuration without exposing secrets", () => {
    const result = parseLineEnvironment({
      LINE_ENVIRONMENT: "development",
      LINE_PROVIDER_ID: "provider-dev",
      LINE_LOGIN_CHANNEL_ID: "login-dev",
      LINE_MINI_APP_LIFF_ID: "123-dev",
      LINE_MESSAGING_CHANNEL_SECRET: "secret-value",
      LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: "token-value",
    });
    expect(result.environment).toBe("development");
    expect(JSON.stringify(result.publicConfig)).not.toContain("secret-value");
    expect(JSON.stringify(result.publicConfig)).not.toContain("token-value");
  });

  it("accepts a complete Production LINE configuration", () => {
    const result = parseLineEnvironment({
      LINE_ENVIRONMENT: "production",
      LINE_PROVIDER_ID: "provider-prod",
      LINE_LOGIN_CHANNEL_ID: "login-prod",
      LINE_MINI_APP_LIFF_ID: "liff-prod",
      LINE_MESSAGING_CHANNEL_SECRET: "secret-prod",
      LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: "token-prod",
    });
    expect(result.environment).toBe("production");
    expect(result.publicConfig).toEqual({ environment: "production", liffId: "liff-prod" });
  });
});
