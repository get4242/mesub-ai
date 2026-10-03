import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { prepareMediaUpload, type MediaRepository } from "@/features/media/action-logic";
import { inspectImageBytes } from "@/features/media/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "กรุณาเลือกรูปภาพอีกครั้ง" }, { status: 400 });
  }
  const propertyId = formData.get("propertyId");
  const file = formData.get("file");
  if (
    typeof propertyId !== "string" ||
    !file ||
    typeof file === "string" ||
    typeof file.arrayBuffer !== "function" ||
    typeof file.name !== "string"
  ) {
    return NextResponse.json({ ok: false, message: "กรุณาเลือกรูปภาพอีกครั้ง" }, { status: 400 });
  }

  const context = await requireAgentContext();
  const admin = createAdminClient();
  const { data: property } = await admin
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("tenant_id", context.tenantId)
    .maybeSingle();
  if (!property) return NextResponse.json({ ok: false, message: "ไม่พบทรัพย์นี้" }, { status: 404 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  let width: number;
  let height: number;
  try {
    ({ width, height } = inspectImageBytes(bytes, file.type));
  } catch {
    return NextResponse.json({ ok: false, message: "ไฟล์รูปไม่ถูกต้อง" }, { status: 400 });
  }

  const repository: MediaRepository = {
    async countActive(targetPropertyId, tenantId) {
      const { count, error } = await admin
        .from("property_media")
        .select("id", { count: "exact", head: true })
        .eq("property_id", targetPropertyId)
        .eq("tenant_id", tenantId)
        .neq("status", "archived");
      if (error) throw error;
      return count ?? 0;
    },
    async insertUploading(value) {
      const { error } = await admin.from("property_media").insert({
        id: value.id, tenant_id: value.tenantId, property_id: value.propertyId,
        bucket_id: value.bucketId, object_path: value.objectPath,
        original_filename: value.originalFilename, mime_type: value.mimeType,
        byte_size: value.byteSize, width: value.width, height: value.height,
        checksum_sha256: value.checksumSha256, position: value.position, status: "uploading",
      });
      if (error) throw error;
    },
    async createUploadToken() {
      return "server-upload";
    },
  };

  const prepared = await prepareMediaUpload({
    propertyId,
    originalFilename: file.name,
    mimeType: file.type,
    byteSize: file.size,
    width,
    height,
    checksumSha256: createHash("sha256").update(bytes).digest("hex"),
    signature: Array.from(bytes.slice(0, 16)),
  }, context, repository, randomUUID);
  if (!prepared.ok) return NextResponse.json({ ok: false, message: prepared.message }, { status: 400 });

  const { error: uploadError } = await admin.storage
    .from(prepared.data.bucketId)
    .upload(prepared.data.objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    await admin.from("property_media").update({ status: "failed" }).eq("id", prepared.data.mediaId).eq("tenant_id", context.tenantId);
    return NextResponse.json({ ok: false, message: "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });
  }

  const { error: readyError } = await admin
    .from("property_media")
    .update({ status: "ready" })
    .eq("id", prepared.data.mediaId)
    .eq("tenant_id", context.tenantId)
    .eq("status", "uploading");
  if (readyError) return NextResponse.json({ ok: false, message: "บันทึกรูปไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    media: {
      id: prepared.data.mediaId,
      original_filename: file.name,
      position: await repository.countActive(propertyId, context.tenantId) - 1,
      status: "ready",
    },
  });
}
