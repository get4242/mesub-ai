import { z } from "zod";

export const aiFieldKeys = [
  "listing_type", "property_type", "title", "description", "province", "district", "subdistrict",
  "address_line", "latitude", "longitude", "price", "land_area_sqm", "building_area_sqm", "bedrooms", "bathrooms"
] as const;

export type AiFieldKey = (typeof aiFieldKeys)[number];

const aiSuggestionSchema = z.object({
  fieldKey: z.enum(aiFieldKeys),
  value: z.unknown().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  confidenceUnknown: z.boolean(),
  sourceIds: z.array(z.string().min(1)).max(20)
}).strict().superRefine((suggestion, context) => {
  if (suggestion.confidenceUnknown !== (suggestion.confidence === null)) {
    context.addIssue({ code: "custom", message: "CONFIDENCE_INVALID" });
  }
  if (suggestion.value === null && !suggestion.confidenceUnknown) {
    context.addIssue({ code: "custom", message: "UNKNOWN_VALUE_INVALID" });
  }
});

export const aiStructuredOutputV1Schema = z.object({
  schemaVersion: z.literal(1),
  suggestions: z.array(aiSuggestionSchema).max(50)
}).strict();

export type AiStructuredOutputV1 = z.infer<typeof aiStructuredOutputV1Schema>;

export type AiInputSnapshotV1 = {
  schemaVersion: 1;
  tenantId: string;
  agentProfileId: string;
  property: Record<string, unknown> & { id: string; version: number };
  media: Array<{ id: string; checksumSha256: string }>;
  agentText: string;
};

export type ValidatedSuggestion = AiStructuredOutputV1["suggestions"][number] & { validationStatus: "valid" };
