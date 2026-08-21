import { z } from "zod";

const decimalString = z.string().regex(/^\d+(?:\.\d{1,4})?$/).refine((value) => Number(value) >= 0);
const positiveArea = decimalString.refine((value) => Number(value) > 0);

const propertyFields = {
  listingType: z.enum(["sale", "rent"]),
  propertyType: z.enum(["land", "detached_house", "townhouse", "condominium", "commercial_building", "other"]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  province: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  subdistrict: z.string().trim().max(100).optional(),
  addressLine: z.string().trim().max(500).optional(),
  price: decimalString,
  currency: z.literal("THB"),
  landAreaSquareMetres: positiveArea.optional(),
  buildingAreaSquareMetres: positiveArea.optional(),
  bedrooms: z.number().int().nonnegative().max(100).optional(),
  bathrooms: z.number().int().nonnegative().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
};

function validateConditionalFields(value: z.infer<z.ZodObject<typeof propertyFields>>, context: z.RefinementCtx) {
  const buildingHome = ["detached_house", "townhouse", "condominium"].includes(value.propertyType);
  if (value.propertyType === "land" && !value.landAreaSquareMetres) context.addIssue({ code: "custom", path: ["landAreaSquareMetres"], message: "Land area is required" });
  if (buildingHome) {
    if (!value.buildingAreaSquareMetres) context.addIssue({ code: "custom", path: ["buildingAreaSquareMetres"], message: "Building area is required" });
    if (value.bedrooms === undefined) context.addIssue({ code: "custom", path: ["bedrooms"], message: "Bedrooms are required" });
    if (value.bathrooms === undefined) context.addIssue({ code: "custom", path: ["bathrooms"], message: "Bathrooms are required" });
  }
  if (value.propertyType === "commercial_building" && !value.buildingAreaSquareMetres) context.addIssue({ code: "custom", path: ["buildingAreaSquareMetres"], message: "Building area is required" });
  if (value.propertyType === "other" && !value.landAreaSquareMetres && !value.buildingAreaSquareMetres) context.addIssue({ code: "custom", path: ["landAreaSquareMetres"], message: "At least one area is required" });
}

export const propertyDraftSchema = z.object(propertyFields).strict().superRefine(validateConditionalFields);

export const propertyUpdateSchema = z.object({
  propertyId: z.uuid(),
  expectedVersion: z.number().int().positive(),
  status: z.enum(["draft", "pending_confirmation", "archived"]).optional(),
  ...Object.fromEntries(Object.entries(propertyFields).map(([key, schema]) => [key, schema.optional()]))
}).strict();

export const CRITICAL_PROPERTY_FIELDS = [
  "listingType", "propertyType", "price", "province", "district", "subdistrict", "addressLine",
  "latitude", "longitude", "landAreaSquareMetres", "buildingAreaSquareMetres", "bedrooms", "bathrooms"
] as const;

export type PropertyDraftInput = z.infer<typeof propertyDraftSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
