// Utility functions for localStorage/sessionStorage access
// Provides type-safe storage with SSR safety

export const storage = {
  // Get item from storage
  get: <T = string>(key: string, defaultValue?: T): T | null => {
    if (typeof window === 'undefined') return defaultValue ?? null;
    
    try {
      const item = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!item) return defaultValue ?? null;
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error);
      return defaultValue ?? null;
    }
  },

  // Set item in localStorage
  set: (key: string, value: any, useSession = false): void => {
    if (typeof window === 'undefined') return;
    
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (useSession) {
        sessionStorage.setItem(key, stringValue);
      } else {
        localStorage.setItem(key, stringValue);
      }
    } catch (error) {
      console.error(`Error writing to storage (${key}):`, error);
    }
  },

  // Remove item from both storages
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from storage (${key}):`, error);
    }
  },

  // Clear all storage
  clear: (): void => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

// Specific storage keys (for type safety and consistency)
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  THEME: 'theme',
  HERO_VIDEO_ENABLED: 'heroVideoEnabled',
} as const;
