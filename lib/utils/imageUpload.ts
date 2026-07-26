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
  if (!isHeicImage(file)) return file;

  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "image";

    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch (error) {
    console.error("HEIC conversion failed", error);
    throw new Error(
      "This HEIC photo could not be converted. Please try another photo or export it as JPEG."
    );
  }
}
