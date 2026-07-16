import type { BookingItem, LengthOption } from "@/lib/booking-types";
import { galleryApi } from "@/lib/api/gallery";
import { getAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";

export function slugify(s: string) {
    return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function emptyItem(): BookingItem {
    return { name: "", price: "", description: "", lengthOptions: [] };
}

export function emptyLengthOption(): LengthOption {
    return { name: "", price: "$", notes: "$50.00 deposit required" };
}

export function formatPrice(price: number | string | undefined): string {
    if (price === undefined || price === null || price === "") {
        return "$0";
    }
    const numPrice = typeof price === "string" ? parseFloat(price.replace(/[^0-9.]/g, "")) : price;
    if (isNaN(numPrice)) {
        return "$0";
    }
    return `$${numPrice.toLocaleString()}`;
}

type GalleryImageRelationship = {
  categoryId?: number;
  subcategoryId?: number;
  serviceItemId?: number;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

function normalizeUploadedUrl(rawUrl: string): string {
  if (!rawUrl) return "";

  const backendUrl = API_BASE_URL.replace(/\/$/, "");

  try {
    const parsed = new URL(rawUrl);

    if (parsed.pathname.startsWith("/uploads/")) {
      return `${backendUrl}${parsed.pathname}`;
    }

    if (parsed.pathname.startsWith("/api/gallery/image/")) {
      return `${backendUrl}${parsed.pathname}`;
    }

    return rawUrl;
  } catch {
    if (rawUrl.startsWith("/uploads/")) {
      return `${backendUrl}${rawUrl}`;
    }

    if (rawUrl.startsWith("/api/gallery/image/")) {
      return `${backendUrl}${rawUrl}`;
    }

    return rawUrl;
  }
}

export async function uploadFile(
  file: File,
  token: string,
  relationship: GalleryImageRelationship = {},
  useSimpleUpload: boolean = false
): Promise<string> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 10MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed types: JPEG, PNG, WebP, GIF.`);
  }

  // Validate token
  if (!token) {
    throw new Error('Authentication required. Please log in and try again.');
  }

  try {
    if (useSimpleUpload) {
      // Use simple upload endpoint for size photos (doesn't go to gallery)
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }
      
      const result = await response.json();
      return normalizeUploadedUrl(result.url || result.imageUrl || result.path);
    } else {
      // Use gallery API for gallery images
      const result = await galleryApi.uploadImage({
        file,
        title: file.name,
        ...relationship,
      });

      return result.imageUrl;
    }
  } catch (error) {
    console.error("Upload failed:", error);

    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('Authentication failed. Please log in again.');
      }
      if (error.message.includes('413')) {
        throw new Error('File too large. Please upload a smaller file (max 10MB).');
      }
      if (error.message.includes('415')) {
        throw new Error('Unsupported file type. Please use JPEG, PNG, WebP, or GIF.');
      }
      throw error;
    }

    throw new Error('Upload failed. Please check your connection and try again.');
  }
}
