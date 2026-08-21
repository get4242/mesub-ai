import { describe, expect, it } from "vitest";
import { prepareMediaUpload, type MediaRepository } from "./action-logic";

const context = { userId: "user-a", tenantId: "tenant-a", membershipId: "membership-a", agentProfileId: "agent-a" };
const input = {
  propertyId: "550e8400-e29b-41d4-a716-446655440000",
  originalFilename: "home.jpg",
  mimeType: "image/jpeg",
  byteSize: 1024,
  width: 1200,
  height: 800,
  checksumSha256: "a".repeat(64),
  signature: [0xff, 0xd8, 0xff]
};

describe("prepareMediaUpload", () => {
  it("builds tenant-scoped non-forgeable metadata", async () => {
    let inserted: Parameters<MediaRepository["insertUploading"]>[0] | undefined;
    const repository: MediaRepository = {
      countActive: async () => 0,
      insertUploading: async (value) => { inserted = value; },
      createUploadToken: async () => "token"
    };
    const result = await prepareMediaUpload(input, context, repository, () => "20000000-0000-4000-8000-000000000001");
    expect(result).toMatchObject({ ok: true, data: { uploadToken: "token" } });
    expect(inserted).toMatchObject({ tenantId: "tenant-a", propertyId: input.propertyId, bucketId: "property-intake" });
    expect(inserted?.objectPath).toMatch(/^tenant-a\/550e8400-e29b-41d4-a716-446655440000\/20000000-/);
  });

  it("rejects the twenty-first active media item", async () => {
    const repository: MediaRepository = { countActive: async () => 20, insertUploading: async () => undefined, createUploadToken: async () => "unused" };
    await expect(prepareMediaUpload(input, context, repository, crypto.randomUUID)).resolves.toMatchObject({ ok: false, code: "MEDIA_LIMIT_REACHED" });
  });
});
