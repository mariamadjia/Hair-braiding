import { apiClient } from './client';
import { API_BASE_URL } from '../config/api';
import { getAuthToken } from '../utils/auth';

export interface GalleryImage {
    id: number;
    title: string;
    description?: string;
    imageUrl: string;
    thumbnailUrl?: string;
    altText?: string;
    fileSize?: number;
    width?: number;
    height?: number;
    mimeType?: string;
    displayOrder: number;
    isFeatured: boolean;
    isHero: boolean;
    tags: string[];
    categoryId?: number;
    categoryName?: string;
    subcategoryId?: number;
    subcategoryName?: string;
    serviceItemId?: number;
    serviceItemName?: string;
    createdAt: string;
    updatedAt: string;
    uploadedBy?: string;
}

export interface ImageUploadData {
    file: File;
    title?: string;
    description?: string;
    altText?: string;
    tags?: string[];
    categoryId?: number;
    subcategoryId?: number;
    serviceItemId?: number;
    isFeatured?: boolean;
    isHero?: boolean;
}

export interface ImageUpdateData {
    title?: string;
    description?: string;
    altText?: string;
    tags?: string[];
    categoryId?: number;
    subcategoryId?: number;
    serviceItemId?: number;
    isFeatured?: boolean;
    isHero?: boolean;
    displayOrder?: number;
}

export const galleryApi = {
    // Get all images
    getAllImages: async (): Promise<GalleryImage[]> => {
        return await apiClient<GalleryImage[]>('/api/gallery');
    },

    // Get images by category
    getImagesByCategory: async (categoryId: number): Promise<GalleryImage[]> => {
        return await apiClient<GalleryImage[]>(`/api/gallery/category/${categoryId}`);
    },

    // Get images by subcategory
    getImagesBySubcategory: async (subcategoryId: number): Promise<GalleryImage[]> => {
        return await apiClient<GalleryImage[]>(`/api/gallery/subcategory/${subcategoryId}`);
    },

    // Get featured images
    getFeaturedImages: async (): Promise<GalleryImage[]> => {
        return await apiClient<GalleryImage[]>('/api/gallery/featured');
    },

    // Search images
    searchImages: async (query: string): Promise<GalleryImage[]> => {
        return await apiClient<GalleryImage[]>(`/api/gallery/search?q=${encodeURIComponent(query)}`);
    },

    // Get images by tag
    getImagesByTag: async (tag: string): Promise<GalleryImage[]> => {
        return await apiClient<GalleryImage[]>(`/api/gallery/tag/${encodeURIComponent(tag)}`);
    },

    // Get all tags
    getAllTags: async (): Promise<string[]> => {
        return await apiClient<string[]>('/api/gallery/tags');
    },

    // Upload image
    uploadImage: async (data: ImageUploadData, onProgress?: (progress: number) => void): Promise<GalleryImage> => {
        const formData = new FormData();
        formData.append('file', data.file);
        
        if (data.title) formData.append('title', data.title);
        if (data.description) formData.append('description', data.description);
        if (data.altText) formData.append('altText', data.altText);
        if (data.tags) data.tags.forEach(tag => formData.append('tags', tag));
        if (data.categoryId) formData.append('categoryId', data.categoryId.toString());
        if (data.subcategoryId) formData.append('subcategoryId', data.subcategoryId.toString());
        if (data.serviceItemId) formData.append('serviceItemId', data.serviceItemId.toString());
        if (data.isFeatured !== undefined) formData.append('isFeatured', data.isFeatured.toString());
        if (data.isHero !== undefined) formData.append('isHero', data.isHero.toString());

        const token = getAuthToken();
        
        const response = await fetch(`${API_BASE_URL}/api/gallery/upload`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        return await response.json();
    },

    // Update image
    updateImage: async (id: number, data: ImageUpdateData): Promise<GalleryImage> => {
        return await apiClient<GalleryImage>(`/api/gallery/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Delete image
    deleteImage: async (id: number): Promise<void> => {
        await apiClient(`/api/gallery/${id}`, {
            method: 'DELETE',
        });
    },

    // Reorder images
    reorderImages: async (imageIds: number[]): Promise<void> => {
        await apiClient('/api/gallery/reorder', {
            method: 'POST',
            body: JSON.stringify(imageIds),
        });
    },

    // Update category flipping images
    updateCategoryFlippingImages: async (categoryId: number, imageUrls: string[]): Promise<void> => {
        await apiClient(`/api/categories/${categoryId}/flipping-images`, {
            method: 'PUT',
            body: JSON.stringify(imageUrls),
        });
    },
};
