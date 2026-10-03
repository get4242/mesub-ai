import { describe, expect, it } from "vitest";
import { formatPropertyPrice } from "./price-display";

describe("formatPropertyPrice", () => {
  it("shows a land listing price per rai while keeping total price as its source", () => {
    expect(formatPropertyPrice({
      property_type: "land", price: 277_500_000, land_area_sqm: 44_400,
    })).toBe("฿10,000,000 / ไร่");
  });

  it("keeps the normal total price for a building or legacy value without a land area", () => {
    expect(formatPropertyPrice({ property_type: "detached_house", price: 3_900_000 })).toBe("฿3,900,000");
    expect(formatPropertyPrice({ property_type: "land", price: 5_000, land_area_sqm: 80_000 })).toBe("฿5,000");
  });
});
