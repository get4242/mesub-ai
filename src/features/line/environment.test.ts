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

  it("rejects Production in this implementation round", () => {
    expect(() =>
      parseLineEnvironment({ LINE_ENVIRONMENT: "production" }),
    ).toThrow("LINE_PRODUCTION_FORBIDDEN");
  });
});
