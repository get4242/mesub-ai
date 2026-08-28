import { describe, expect, it } from "vitest";
import { validateAiOutput } from "./output-validator";

describe("validateAiOutput", () => {
  it("requires evidence for important non-null facts", () => {
    expect(validateAiOutput({ schemaVersion: 1, suggestions: [{ fieldKey: "price", value: 2500000, confidence: 0.9, confidenceUnknown: false, sourceIds: [] }] }, new Set())).toEqual({ ok: false, code: "SOURCE_REQUIRED" });
  });

  it("rejects a source outside the current run", () => {
    expect(validateAiOutput({ schemaVersion: 1, suggestions: [{ fieldKey: "price", value: 2500000, confidence: 0.9, confidenceUnknown: false, sourceIds: ["other"] }] }, new Set(["own"]))).toEqual({ ok: false, code: "SOURCE_REQUIRED" });
  });

  it("rejects malformed numeric values", () => {
    expect(validateAiOutput({ schemaVersion: 1, suggestions: [{ fieldKey: "price", value: "expensive", confidence: 0.9, confidenceUnknown: false, sourceIds: ["own"] }] }, new Set(["own"]))).toEqual({ ok: false, code: "VALUE_INVALID" });
  });

  it("rejects content beyond the configured bound", () => {
    expect(validateAiOutput({ schemaVersion: 1, suggestions: [{ fieldKey: "description", value: "12345", confidence: 0.9, confidenceUnknown: false, sourceIds: [] }] }, new Set(), { maxContentCharacters: 4 })).toEqual({ ok: false, code: "VALUE_INVALID" });
  });

  it("returns normalized validated suggestions", () => {
    expect(validateAiOutput({ schemaVersion: 1, suggestions: [{ fieldKey: "price", value: 2500000, confidence: 0.9, confidenceUnknown: false, sourceIds: ["own"] }] }, new Set(["own"]))).toEqual({
      ok: true,
      suggestions: [{ fieldKey: "price", value: 2500000, confidence: 0.9, confidenceUnknown: false, sourceIds: ["own"], validationStatus: "valid" }]
    });
  });
});
