import { aiStructuredOutputV1Schema, type AiFieldKey, type ValidatedSuggestion } from "./contracts";

type ValidationFailure = { ok: false; code: "SCHEMA_INVALID" | "SOURCE_REQUIRED" | "VALUE_INVALID" | "UNSUPPORTED_FIELD" };
type ValidationSuccess = { ok: true; suggestions: ValidatedSuggestion[] };

const importantFields = new Set<AiFieldKey>([
  "listing_type", "property_type", "province", "district", "subdistrict", "address_line", "latitude", "longitude",
  "price", "land_area_sqm", "building_area_sqm", "bedrooms", "bathrooms"
]);
const numericFields = new Set<AiFieldKey>(["latitude", "longitude", "price", "land_area_sqm", "building_area_sqm", "bedrooms", "bathrooms"]);

export function validateAiOutput(
  output: unknown,
  sourceIds: ReadonlySet<string>,
  limits: { maxContentCharacters: number } = { maxContentCharacters: 5_000 }
): ValidationFailure | ValidationSuccess {
  const parsed = aiStructuredOutputV1Schema.safeParse(output);
  if (!parsed.success) {
    const unsupported = parsed.error.issues.some((issue) => issue.path.includes("fieldKey"));
    return { ok: false, code: unsupported ? "UNSUPPORTED_FIELD" : "SCHEMA_INVALID" };
  }

  for (const suggestion of parsed.data.suggestions) {
    if (suggestion.sourceIds.some((id) => !sourceIds.has(id)) || (suggestion.value !== null && importantFields.has(suggestion.fieldKey) && suggestion.sourceIds.length === 0)) {
      return { ok: false, code: "SOURCE_REQUIRED" };
    }
    if (suggestion.value !== null && numericFields.has(suggestion.fieldKey) && (typeof suggestion.value !== "number" || !Number.isFinite(suggestion.value))) {
      return { ok: false, code: "VALUE_INVALID" };
    }
    if ((suggestion.fieldKey === "title" || suggestion.fieldKey === "description") && suggestion.value !== null && (typeof suggestion.value !== "string" || suggestion.value.length > limits.maxContentCharacters)) {
      return { ok: false, code: "VALUE_INVALID" };
    }
  }
  return { ok: true, suggestions: parsed.data.suggestions.map((suggestion) => ({ ...suggestion, validationStatus: "valid" as const })) };
}
