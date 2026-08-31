import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolvePublicMedia,
  type PublicMediaRepository,
} from "@/features/properties/public-media";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const admin = createAdminClient();
  const repository: PublicMediaRepository = {
    async findProjected(id) {
      const { data } = await admin
        .from("public_property_media")
        .select("media_id,mime_type,public_properties!inner(id)")
        .eq("media_id", id)
        .maybeSingle();
      return data ? { mediaId: data.media_id, mimeType: data.mime_type } : null;
    },
    async findPrivateObject(id) {
      const { data } = await admin
        .from("property_media")
        .select("bucket_id,object_path")
        .eq("id", id)
        .eq("status", "ready")
        .eq("bucket_id", "property-published")
        .maybeSingle();
      return data
        ? { bucketId: data.bucket_id, objectPath: data.object_path }
        : null;
    },
    async download(bucketId, objectPath) {
      const { data, error } = await admin.storage
        .from(bucketId)
        .download(objectPath);
      return error || !data ? null : new Uint8Array(await data.arrayBuffer());
    },
  };
  const result = await resolvePublicMedia((await params).mediaId, repository);
  if (!result.ok) return NextResponse.json({ found: false }, { status: 404 });
  const body = result.bytes.buffer.slice(
    result.bytes.byteOffset,
    result.bytes.byteOffset + result.bytes.byteLength,
  ) as ArrayBuffer;
  return new NextResponse(body, {
    headers: {
      "Content-Type": result.mimeType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
