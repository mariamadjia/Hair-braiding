const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const HEIC_EXTENSIONS = [".heic", ".heif"];

export const IMAGE_UPLOAD_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif";

export function isHeicImage(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    HEIC_MIME_TYPES.has(file.type.toLowerCase()) ||
    HEIC_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
  );
}

export async function normalizeImageForUpload(file: File): Promise<File> {
  let normalized = file;

  if (isHeicImage(file)) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.88 });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "image";

      normalized = new File([blob], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    } catch (error) {
      console.error("HEIC conversion failed", error);
      throw new Error("This HEIC photo could not be converted. Please try another photo or export it as JPEG.");
    }
  }

  // Large phone photos waste upload time. Hero/service imagery does not need
  // dimensions beyond 2000px for the current layouts.
  if (normalized.type !== "image/jpeg" || normalized.size < 1_500_000) return normalized;
  try {
    const bitmap = await createImageBitmap(normalized);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= normalized.size) return normalized;
    return new File([blob], normalized.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: normalized.lastModified,
    });
  } catch {
    return normalized;
  }
}
