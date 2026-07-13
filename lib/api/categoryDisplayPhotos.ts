import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";
import { fromProxyUrl, toProxyUrl } from "@/lib/utils/image";

export type CategoryDisplayPhotos = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  displayOrder?: number | null;
  flippingImages?: string[];
  fallbackImages?: string[];
};

export const getDisplayImages = (category: CategoryDisplayPhotos) => {
  const images =
    category.flippingImages && category.flippingImages.length > 0
      ? category.flippingImages
      : category.fallbackImages || [];

  return images.filter(Boolean).map((url) => toProxyUrl(url));
};

export async function fetchCategoryDisplayPhotos() {
  const res = await fetch(`${API_BASE_URL}/api/categories/gallery-cards`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load category display photos: ${res.status}`);
  }

  const data = await res.json();

  return Array.isArray(data) ? data : [];
}

export async function saveCategoryFlippingImages(
  categoryId: number,
  imageUrls: string[]
) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const backendUrls = imageUrls
    .map(fromProxyUrl)
    .filter((url): url is string => Boolean(url));

  const res = await fetch(
    `${API_BASE_URL}/api/categories/${categoryId}/flipping-images`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(backendUrls),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to save flipping images: ${res.status} ${text}`);
  }

  return backendUrls;
}
