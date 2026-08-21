const MAX_FILE_SIZE = 10 * 1024 * 1024;

type MediaFileMetadata = {
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
  width: number;
  height: number;
};

function detectedMime(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export function validateMediaFile(file: MediaFileMetadata) {
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) throw new Error("MEDIA_TOO_LARGE");
  if (!Number.isInteger(file.width) || !Number.isInteger(file.height) || file.width <= 0 || file.height <= 0 || file.width > 20000 || file.height > 20000) throw new Error("MEDIA_DIMENSIONS_INVALID");
  const extension = file.name.toLowerCase().split(".").pop();
  const allowed: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  if (!extension || allowed[extension] !== file.type || detectedMime(file.bytes) !== file.type) throw new Error("MEDIA_SIGNATURE_MISMATCH");
  return { extension, mimeType: file.type };
}

export function buildPropertyMediaPath(tenantId: string, propertyId: string, mediaId: string, originalFilename: string) {
  const pieces = originalFilename.toLowerCase().split(".");
  const extension = pieces.pop()?.replace(/[^a-z0-9]/g, "") || "bin";
  const stem = pieces.join("-").normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image";
  return `${tenantId}/${propertyId}/${mediaId}/${stem}.${extension}`;
}

export function inspectImageBytes(bytes: Uint8Array, mimeType: string) {
  if (detectedMime(bytes) !== mimeType) throw new Error("MEDIA_SIGNATURE_MISMATCH");
  if (mimeType === "image/png" && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mimeType === "image/jpeg") {
    for (let offset = 2; offset + 8 < bytes.length;) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
      if (marker && [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: (bytes[offset + 5]! << 8) + bytes[offset + 6]!, width: (bytes[offset + 7]! << 8) + bytes[offset + 8]! };
      }
      offset += 2 + length;
    }
  }
  if (mimeType === "image/webp" && bytes.length >= 30 && String.fromCharCode(...bytes.slice(12, 16)) === "VP8X") {
    return { width: 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16), height: 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16) };
  }
  throw new Error("MEDIA_DIMENSIONS_INVALID");
}
