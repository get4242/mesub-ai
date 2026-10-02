const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.86;

function jpegName(name: string) {
  const stem = name.replace(/\.[^.]+$/, "").trim() || "property-image";
  return `${stem}.jpg`;
}

export async function resizeImageForUpload(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    return blob ? new File([blob], jpegName(file.name), { type: "image/jpeg" }) : file;
  } finally {
    bitmap.close();
  }
}
