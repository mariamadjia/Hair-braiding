import { apiClient } from './client';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  flippingImages?: string[];
}

export interface Subcategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  categoryId: number;
}

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    return apiClient<Category[]>('/api/categories');
  },

  getById: async (id: number): Promise<Category> => {
    return apiClient<Category>(`/api/categories/${id}`);
  },

  getBySlug: async (slug: string): Promise<Category> => {
    return apiClient<Category>(`/api/categories/slug/${slug}`);
  },

  create: async (category: Omit<Category, 'id'>): Promise<Category> => {
    return apiClient<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category)
    });
  },

  update: async (id: number, category: Partial<Category>): Promise<Category> => {
    return apiClient<Category>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category)
    });
  },

  delete: async (id: number): Promise<void> => {
    return apiClient(`/api/categories/${id}`, {
      method: 'DELETE'
    });
  },

  reorder: async (categoryIds: number[]): Promise<void> => {
    return apiClient('/api/categories/reorder', {
      method: 'POST',
      body: JSON.stringify(categoryIds)
    });
  }
};
