import { API_BASE_URL } from '../config/api';

// Helper function to convert image URLs to proxy endpoint for authentication
export const toProxyUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '';
  // If already a proxy URL, return as is
  if (imageUrl.includes('/api/proxy-image?url=')) return imageUrl;
  // If it's a Gallery path, convert to proxy
  if (imageUrl.startsWith('/Gallery/uploads/')) {
    const filename = imageUrl.split('/').pop();
    return `/api/proxy-image?url=${encodeURIComponent(`${API_BASE_URL}/api/gallery/image/${filename}`)}`;
  }
  // If it's already a full URL with the backend, convert to proxy
  if (imageUrl.startsWith(API_BASE_URL)) {
    return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  }
  // Otherwise return as is (local public assets)
  return imageUrl;
};

// Helper function to convert proxy URLs back to backend URLs for saving
export const fromProxyUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '';
  // If it's a proxy URL, extract the original URL
  if (imageUrl.includes('/api/proxy-image?url=')) {
    const urlParam = imageUrl.split('url=')[1];
    return decodeURIComponent(urlParam);
  }
  // Otherwise return as is
  return imageUrl;
};
