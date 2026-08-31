const mediaIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PublicMediaRepository = {
  findProjected(
    id: string,
  ): Promise<{ mediaId: string; mimeType: string } | null>;
  findPrivateObject(
    id: string,
  ): Promise<{ bucketId: string; objectPath: string } | null>;
  download(bucketId: string, objectPath: string): Promise<Uint8Array | null>;
};

export async function resolvePublicMedia(
  id: string,
  repository: PublicMediaRepository,
) {
  if (!mediaIdPattern.test(id)) return { ok: false as const };
  const projected = await repository.findProjected(id);
  if (!projected || !allowedMimeTypes.has(projected.mimeType))
    return { ok: false as const };
  const object = await repository.findPrivateObject(projected.mediaId);
  if (!object || object.bucketId !== "property-published")
    return { ok: false as const };
  const bytes = await repository.download(object.bucketId, object.objectPath);
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > 10 * 1024 * 1024)
    return { ok: false as const };
  return { ok: true as const, mimeType: projected.mimeType, bytes };
}
