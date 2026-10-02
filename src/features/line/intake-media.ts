import "server-only";
import { createHash } from "node:crypto";
import { buildPropertyMediaPath,inspectImageBytes,validateMediaFile } from "../media/validation";
import { lineReplyRetryKey } from "./conversation-delivery";

const MAX_BYTES=10*1024*1024;
export async function downloadLineImage(messageId: string,accessToken: string,request: typeof fetch=fetch) {
  if (!/^\d{1,100}$/.test(messageId)) throw new Error("LINE_IMAGE_ID_INVALID");
  const response=await request(`https://api-data.line.me/v2/bot/message/${messageId}/content`,{
    headers: { Authorization: `Bearer ${accessToken}` },redirect: "error",signal: AbortSignal.timeout(15000),
  });
  if (!response.ok || !response.body) throw new Error("LINE_IMAGE_DOWNLOAD_FAILED");
  const mimeType=response.headers.get("content-type")?.split(";")[0]?.trim();
  const extensions: Record<string,string>={ "image/jpeg": "jpg","image/png": "png","image/webp": "webp" };
  if (!mimeType || !extensions[mimeType] || Number(response.headers.get("content-length"))>MAX_BYTES) throw new Error("LINE_IMAGE_INVALID");
  const reader=response.body.getReader(); const chunks: Uint8Array[]=[]; let size=0;
  try {
    while(true) {
      const part=await reader.read();if(part.done) break;
      size+=part.value.byteLength;
      if(size>MAX_BYTES) throw new Error("MEDIA_TOO_LARGE");
      chunks.push(part.value);
    }
  } finally { await reader.cancel(); }
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks) { bytes.set(chunk,offset);offset+=chunk.length; }
  const dimensions=inspectImageBytes(bytes,mimeType);
  const name=`line-${messageId}.${extensions[mimeType]}`;
  validateMediaFile({ name,type: mimeType,size,bytes,...dimensions });
  return { bytes,mimeType,name,...dimensions,checksum: createHash("sha256").update(bytes).digest("hex") };
}

export function lineImageMetadata(session: { id: string;tenant_id: string;property_id: string },messageId: string,image: Awaited<ReturnType<typeof downloadLineImage>>) {
  const id=lineReplyRetryKey(`${session.id}:${messageId}`,"media");
  return { id,message_id: messageId,
    object_path: buildPropertyMediaPath(session.tenant_id,session.property_id,id,image.name),
    original_filename: image.name,mime_type: image.mimeType,byte_size: image.bytes.length,
    width: image.width,height: image.height,checksum_sha256: image.checksum,
  };
}
