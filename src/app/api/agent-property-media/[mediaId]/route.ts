import { NextResponse } from "next/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const context = await requireAgentContext();
  const admin = createAdminClient();
  const { data: media } = await admin
    .from("property_media")
    .select("bucket_id,object_path,mime_type")
    .eq("id", (await params).mediaId)
    .eq("tenant_id", context.tenantId)
    .eq("status", "ready")
    .maybeSingle();
  if (!media) return NextResponse.json({ found: false }, { status: 404 });

  const { data: file, error } = await admin.storage
    .from(media.bucket_id)
    .download(media.object_path);
  if (error || !file) return NextResponse.json({ found: false }, { status: 404 });

  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      "Content-Type": media.mime_type,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
