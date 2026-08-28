import { describe, expect, it } from "vitest";
import { parsePublicPropertySearch } from "./public-search";

describe("parsePublicPropertySearch", () => {
  it("normalizes text and supplies a deterministic newest-first query", () => {
    expect(parsePublicPropertySearch({ q: "  Chiang   Mai  " })).toEqual({
      q: "Chiang Mai",
      sort: "newest",
      page: 1,
      pageSize: 20
    });
  });

  it("accepts allowlisted filters and caps page size", () => {
    expect(parsePublicPropertySearch({ listingType: "rent", propertyType: "land", minPrice: "1000", maxPrice: "9000", page: "2", pageSize: "500", sort: "price_asc" })).toMatchObject({
      listingType: "rent",
      propertyType: "land",
      minPrice: 1000,
      maxPrice: 9000,
      page: 2,
      pageSize: 50,
      sort: "price_asc"
    });
  });

  it("rejects inverted prices and unknown enum values", () => {
    expect(() => parsePublicPropertySearch({ minPrice: "10", maxPrice: "1" })).toThrow("INVALID_PRICE_RANGE");
    expect(() => parsePublicPropertySearch({ sort: "random" })).toThrow();
  });
});
