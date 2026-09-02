import { describe, expect, it } from "vitest";
import { DEVELOPMENT_RICH_MENU } from "./rich-menu";

describe("Development Rich Menu", () => {
  it("maps only approved MINI App destinations", () => {
    expect(DEVELOPMENT_RICH_MENU.map((item) => item.path)).toEqual([
      "/dashboard", "/dashboard/properties", "/dashboard/properties/new",
      "/dashboard/leads", "/dashboard/profile",
    ]);
  });
});
