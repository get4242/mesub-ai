import { describe, expect, it } from "vitest";
import { buildPropertyMediaPath, inspectImageBytes, validateMediaFile } from "./validation";

describe("media validation", () => {
  it("accepts a JPEG whose MIME, extension and magic bytes agree", () => {
    expect(validateMediaFile({ name: "home.jpg", type: "image/jpeg", size: 1024, bytes: new Uint8Array([0xff, 0xd8, 0xff]), width: 1200, height: 800 })).toEqual({ extension: "jpg", mimeType: "image/jpeg" });
  });

  it("rejects MIME, extension and magic-byte mismatches", () => {
    expect(() => validateMediaFile({ name: "home.png", type: "image/png", size: 1024, bytes: new Uint8Array([0xff, 0xd8, 0xff]), width: 10, height: 10 })).toThrow("MEDIA_SIGNATURE_MISMATCH");
  });

  it("rejects empty, oversized and invalid-dimension images", () => {
    const base = { name: "home.webp", type: "image/webp", bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]) };
    expect(() => validateMediaFile({ ...base, size: 10 * 1024 * 1024 + 1, width: 100, height: 100 })).toThrow("MEDIA_TOO_LARGE");
    expect(() => validateMediaFile({ ...base, size: 100, width: 0, height: 100 })).toThrow("MEDIA_DIMENSIONS_INVALID");
  });

  it("builds a server-approved tenant/property/media path with a sanitized filename", () => {
    expect(buildPropertyMediaPath("tenant-a", "property-a", "media-a", "Front View.JPG")).toBe("tenant-a/property-a/media-a/front-view.jpg");
  });

  it("reads trusted PNG dimensions from uploaded bytes", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(png.buffer).setUint32(16, 1200); new DataView(png.buffer).setUint32(20, 800);
    expect(inspectImageBytes(png, "image/png")).toEqual({ width: 1200, height: 800 });
  });
});
