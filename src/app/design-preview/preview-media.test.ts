import { describe, expect, it } from "vitest";
import {
  addPreviewImage,
  movePreviewImage,
  removePreviewImage,
  setPreviewCover,
  PREVIEW_MEDIA_LIMIT,
} from "./preview-media";

const images = ["one", "two", "three"];

describe("Design Preview property media", () => {
  it("limits a property to ten preview images", () => {
    expect(PREVIEW_MEDIA_LIMIT).toBe(10);
    const full = Array.from({ length: 10 }, (_, index) => `image-${index + 1}`);
    expect(addPreviewImage(full, "image-11")).toEqual(full);
    expect(addPreviewImage(images, "four")).toEqual([
      "one",
      "two",
      "three",
      "four",
    ]);
  });

  it("changes cover and preserves all images", () => {
    expect(setPreviewCover(images, "three")).toEqual(["three", "one", "two"]);
  });

  it("reorders and removes images without exceeding the preview boundary", () => {
    expect(movePreviewImage(images, 2, -1)).toEqual(["one", "three", "two"]);
    expect(removePreviewImage(images, "two")).toEqual(["one", "three"]);
  });
});
