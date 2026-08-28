import { z } from "zod";

const optionalNumber = z.preprocess((value) => value === undefined || value === "" ? undefined : Number(value), z.number().nonnegative().optional());
const positiveInteger = z.preprocess((value) => value === undefined || value === "" ? undefined : Number(value), z.number().int().positive().optional());

const schema = z.object({
  q: z.string().max(120).optional(),
  province: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  listingType: z.enum(["sale", "rent"]).optional(),
  propertyType: z.enum(["land", "detached_house", "townhouse", "condominium", "commercial_building", "other"]).optional(),
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: positiveInteger.default(1),
  pageSize: positiveInteger.default(20)
});

export function parsePublicPropertySearch(input: unknown) {
  const result = schema.parse(input);
  if (result.minPrice !== undefined && result.maxPrice !== undefined && result.minPrice > result.maxPrice) {
    throw new Error("INVALID_PRICE_RANGE");
  }
  const normalizedQuery = result.q?.trim().replace(/\s+/g, " ");
  return {
    ...result,
    ...(normalizedQuery ? { q: normalizedQuery } : {}),
    pageSize: Math.min(result.pageSize, 50)
  };
}
