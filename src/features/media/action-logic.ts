import type { AgentContext } from "@/lib/auth/agent-context";
import { buildPropertyMediaPath, validateMediaFile } from "./validation";

export type MediaUploadInput = {
  propertyId: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  checksumSha256: string;
  signature: number[];
};

type UploadingMedia = MediaUploadInput & {
  id: string;
  tenantId: string;
  bucketId: "property-intake";
  objectPath: string;
  position: number;
};

export type MediaRepository = {
  countActive(propertyId: string, tenantId: string): Promise<number>;
  insertUploading(input: UploadingMedia): Promise<void>;
  createUploadToken(path: string): Promise<string>;
};

export async function prepareMediaUpload(input: MediaUploadInput, context: AgentContext, repository: MediaRepository, createId: () => string) {
  if (!/^[0-9a-f]{64}$/.test(input.checksumSha256)) return { ok: false as const, code: "INVALID_MEDIA", message: "Checksum ไม่ถูกต้อง" };
  try {
    validateMediaFile({ name: input.originalFilename, type: input.mimeType, size: input.byteSize, bytes: Uint8Array.from(input.signature), width: input.width, height: input.height });
  } catch {
    return { ok: false as const, code: "INVALID_MEDIA", message: "ไฟล์รูปไม่ผ่านการตรวจสอบ" };
  }
  const count = await repository.countActive(input.propertyId, context.tenantId);
  if (count >= 20) return { ok: false as const, code: "MEDIA_LIMIT_REACHED", message: "ทรัพย์หนึ่งรายการเพิ่มรูปได้สูงสุด 20 รูป" };
  const id = createId();
  const objectPath = buildPropertyMediaPath(context.tenantId, input.propertyId, id, input.originalFilename);
  await repository.insertUploading({ ...input, id, tenantId: context.tenantId, bucketId: "property-intake", objectPath, position: count });
  const uploadToken = await repository.createUploadToken(objectPath);
  return { ok: true as const, data: { mediaId: id, bucketId: "property-intake" as const, objectPath, uploadToken } };
}
