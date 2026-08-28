import { describe, expect, it } from "vitest";
import { parseAiModelProfiles, resolveAiModelProfile } from "./ai-model-profiles";

describe("AI model profiles", () => {
  it("maps every approved task to server configuration", () => {
    expect(
      parseAiModelProfiles({
        OPENAI_MODEL_EXTRACTION: "extract-model",
        OPENAI_MODEL_VISION: "vision-model",
        OPENAI_MODEL_LINE_CONVERSATION: "line-model",
        OPENAI_MODEL_CONTENT: "content-model",
        OPENAI_MODEL_FALLBACK: "fallback-model"
      })
    ).toEqual({
      extraction: "extract-model",
      vision: "vision-model",
      lineConversation: "line-model",
      content: "content-model",
      fallback: "fallback-model"
    });
  });

  it("rejects an empty model profile", () => {
    expect(() =>
      parseAiModelProfiles({
        OPENAI_MODEL_EXTRACTION: "extract-model",
        OPENAI_MODEL_VISION: "",
        OPENAI_MODEL_LINE_CONVERSATION: "line-model",
        OPENAI_MODEL_CONTENT: "content-model",
        OPENAI_MODEL_FALLBACK: "fallback-model"
      })
    ).toThrow();
  });

  it("resolves only approved Phase 2 task keys", () => {
    const profiles = parseAiModelProfiles({
      OPENAI_MODEL_EXTRACTION: "extract-model", OPENAI_MODEL_VISION: "vision-model",
      OPENAI_MODEL_LINE_CONVERSATION: "line-model", OPENAI_MODEL_CONTENT: "content-model",
      OPENAI_MODEL_FALLBACK: "fallback-model"
    });
    expect(resolveAiModelProfile(profiles, "extraction")).toBe("extract-model");
    expect(resolveAiModelProfile(profiles, "fallback")).toBe("fallback-model");
  });
});
