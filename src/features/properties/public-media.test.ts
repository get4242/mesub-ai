import { describe, expect, it } from "vitest";
import { resolvePublicMedia } from "./public-media";

describe("public media authorization", () => {
  it("returns bytes only for projected Published media without exposing a path", async () => {
    const result = await resolvePublicMedia(
      "31000000-0000-4000-8000-000000000001",
      {
        findProjected: async () => ({
          mediaId: "31000000-0000-4000-8000-000000000001",
          mimeType: "image/jpeg",
        }),
        findPrivateObject: async () => ({
          bucketId: "property-published",
          objectPath: "private/path.jpg",
        }),
        download: async () => new Uint8Array([1, 2, 3]),
      },
    );
    expect(result).toEqual({
      ok: true,
      mimeType: "image/jpeg",
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect(JSON.stringify(result)).not.toContain("private/path");
  });

  it("fails closed for invalid, unpublished, and missing private media", async () => {
    const repository = {
      findProjected: async () => null,
      findPrivateObject: async () => null,
      download: async () => null,
    };
    await expect(resolvePublicMedia("invalid", repository)).resolves.toEqual({
      ok: false,
    });
    await expect(
      resolvePublicMedia("31000000-0000-4000-8000-000000000002", repository),
    ).resolves.toEqual({ ok: false });
  });
});
