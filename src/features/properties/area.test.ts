import { describe, expect, it } from "vitest";
import { normalizeArea } from "./area";

describe("normalizeArea", () => {
  it("keeps square metres as a canonical decimal string", () => {
    expect(normalizeArea({ unit: "sqm", value: "00100.50" }).squareMetres).toBe("100.5");
  });

  it("converts square wah exactly", () => {
    expect(normalizeArea({ unit: "sqwah", value: "100" }).squareMetres).toBe("400");
  });

  it("converts rai-ngan-square-wah exactly", () => {
    expect(normalizeArea({ unit: "rai_ngan_sqwah", rai: 1, ngan: 2, sqwah: 50 }).squareMetres).toBe("2600");
  });

  it("rejects negative and malformed areas", () => {
    expect(() => normalizeArea({ unit: "sqm", value: "-1" })).toThrow(/area/i);
    expect(() => normalizeArea({ unit: "sqwah", value: "1e3" })).toThrow(/area/i);
  });
});
