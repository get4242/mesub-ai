import { describe, expect, it } from "vitest";
import { aiStructuredOutputV1Schema } from "./contracts";

describe("AI structured output contract", () => {
  it("rejects provider-controlled ownership fields", () => {
    expect(() => aiStructuredOutputV1Schema.parse({ schemaVersion: 1, suggestions: [{ fieldKey: "tenant_id", value: "forged", confidence: 1, confidenceUnknown: false, sourceIds: [] }] })).toThrow();
  });

  it("accepts explicit unknown without invented value", () => {
    const result = aiStructuredOutputV1Schema.parse({ schemaVersion: 1, suggestions: [{ fieldKey: "price", value: null, confidence: null, confidenceUnknown: true, sourceIds: [] }] });
    expect(result.suggestions[0]!.value).toBeNull();
  });
});
