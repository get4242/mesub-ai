import { describe, expect, it } from "vitest";
import { landAreaFromForm } from "./form-input";
import { normalizeArea } from "./area";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("property area form", () => {
  it("converts mixed Thai units without floating point rounding", () => {
    expect(landAreaFromForm(form({ landAreaUnit: "rai_ngan_sqwah", landRai: "1", landNgan: "2", landSqwah: "50.125" }))).toBe("2600.5");
  });
  it("preserves legacy square metres exactly", () => {
    expect(landAreaFromForm(form({ landAreaSquareMetres: "123.4567" }))).toBe("123.4567");
  });
  it("does not replace missing area with zero", () => {
    expect(landAreaFromForm(form({ landAreaUnit: "rai_ngan_sqwah" }))).toBeUndefined();
  });
  it("uses only the selected unit even when hidden inputs retain values", () => {
    expect(landAreaFromForm(form({ landAreaUnit: "sqwah", landSqwah: "50.1", landAreaSquareMetres: "900", landRai: "3" }))).toBe("200.4");
  });
  it.each(["-1", "NaN", "Infinity", "1e3", "1.5"])("rejects malformed rai %s", (rai) => {
    expect(() => normalizeArea({ unit: "rai_ngan_sqwah", rai, ngan: "0", sqwah: "1" })).toThrow("INVALID_AREA");
  });
});
