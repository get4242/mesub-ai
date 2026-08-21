"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { createClient } from "@/lib/supabase/server";
import { prepareMediaUpload, type MediaRepository, type MediaUploadInput } from "./action-logic";
import { inspectImageBytes } from "./validation";

export async function requestPropertyMediaUploadAction(input: MediaUploadInput) {
  const context = await requireAgentContext();
  const supabase = await createClient();
  const repository: MediaRepository = {
    async countActive(propertyId, tenantId) {
      const { count, error } = await supabase.from("property_media").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("tenant_id", tenantId).neq("status", "archived");
      if (error) throw error;
      return count ?? 0;
    },
    async insertUploading(value) {
      const { error } = await supabase.from("property_media").insert({
        id: value.id, tenant_id: value.tenantId, property_id: value.propertyId, bucket_id: value.bucketId,
        object_path: value.objectPath, original_filename: value.originalFilename, mime_type: value.mimeType,
        byte_size: value.byteSize, width: value.width, height: value.height,
        checksum_sha256: value.checksumSha256, position: value.position, status: "uploading"
      });
      if (error) throw error;
    },
    async createUploadToken(path) {
      const { data, error } = await supabase.storage.from("property-intake").createSignedUploadUrl(path, { upsert: false });
      if (error) throw error;
      return data.token;
    }
  };
  return prepareMediaUpload(input, context, repository, randomUUID);
}

export async function finalizePropertyMediaAction(mediaId: string) {
  const context = await requireAgentContext();
  const supabase = await createClient();
  const { data: media, error } = await supabase.from("property_media").select("id,object_path,property_id,status,mime_type,byte_size,width,height,checksum_sha256").eq("id", mediaId).eq("tenant_id", context.tenantId).eq("status", "uploading").maybeSingle();
  if (error || !media) return { ok: false as const, code: "NOT_FOUND" };
  const slash = media.object_path.lastIndexOf("/");
  const folder = media.object_path.slice(0, slash);
  const filename = media.object_path.slice(slash + 1);
  const { data: objects, error: listError } = await supabase.storage.from("property-intake").list(folder, { search: filename, limit: 2 });
  if (listError || !objects?.some((object) => object.name === filename)) return { ok: false as const, code: "UPLOAD_INCOMPLETE" };
  const { data: uploaded, error: downloadError } = await supabase.storage.from("property-intake").download(media.object_path);
  if (downloadError || !uploaded) return { ok: false as const, code: "UPLOAD_INCOMPLETE" };
  const bytes = new Uint8Array(await uploaded.arrayBuffer());
  try {
    const dimensions = inspectImageBytes(bytes, media.mime_type);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== media.byte_size || dimensions.width !== media.width || dimensions.height !== media.height || checksum !== media.checksum_sha256) {
      return { ok: false as const, code: "UPLOAD_VALIDATION_FAILED" };
    }
  } catch {
    return { ok: false as const, code: "UPLOAD_VALIDATION_FAILED" };
  }
  const { data, error: updateError } = await supabase.from("property_media").update({ status: "ready" }).eq("id", mediaId).eq("tenant_id", context.tenantId).eq("status", "uploading").select("id").maybeSingle();
  if (updateError || !data) return { ok: false as const, code: "UPLOAD_INCOMPLETE" };
  revalidatePath(`/dashboard/properties/${media.property_id}/edit`);
  return { ok: true as const, data: { mediaId } };
}

export async function reorderPropertyMediaAction(propertyId: string, orderedMediaIds: string[]) {
  const context = await requireAgentContext();
  if (orderedMediaIds.length > 20 || new Set(orderedMediaIds).size !== orderedMediaIds.length) return { ok: false as const, code: "INVALID_ORDER" };
  const supabase = await createClient();
  void context;
  const { error } = await supabase.rpc("reorder_property_media", { target_property_id: propertyId, ordered_media_ids: orderedMediaIds });
  if (error) return { ok: false as const, code: "REORDER_FAILED" };
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
  return { ok: true as const };
}

export async function archivePropertyMediaAction(mediaId: string) {
  const context = await requireAgentContext();
  const supabase = await createClient();
  const { data, error } = await supabase.from("property_media").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", mediaId).eq("tenant_id", context.tenantId).select("property_id").maybeSingle();
  if (error || !data) return { ok: false as const, code: "NOT_FOUND" };
  revalidatePath(`/dashboard/properties/${data.property_id}/edit`);
  return { ok: true as const };
}
