# Additional Improvements Needed

## 🔴 High Priority

### 1. **Inconsistent API_URL in Backend API Routes**
**20+ API route files** still have local `API_URL` definitions instead of importing from config.

**Files affected:**
- `app/api/services/route.ts`
- `app/api/services/[id]/route.ts`
- `app/api/admin/services/route.ts`
- `app/api/admin/services/[id]/route.ts`
- `app/api/admin/categories/route.ts`
- `app/api/admin/categories/[slug]/route.ts`
- `app/api/admin/categories/[slug]/subcategories/**/*.ts` (5 files)
- `app/api/health/route.ts` (uses `BACKEND_URL`)
- `app/api/appointments/[id]/approve/route.ts` (uses `BACKEND_URL`)
- `app/api/appointments/[id]/deny/route.ts` (uses `BACKEND_URL`)
- `app/api/bookings/route.ts` (uses `BACKEND_URL`)

**Current pattern:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
// or
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
```

**Should be:**
```typescript
import { API_BASE_URL } from '@/lib/config/api';
```

**Impact:** 
- Inconsistent naming (`API_URL` vs `BACKEND_URL`)
- Duplicate code in 20+ files
- Hard to maintain

---

### 2. **lib/api/categories.ts Not Using Centralized Config**
This file has its own `API_URL` definition and doesn't use `apiClient`.

**Current:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const categoriesApi = {
  async getAll() {
    const response = await fetch(`${API_URL}/api/categories`);
    return response.json();
  },
  async create(category: any, token: string) {
    const response = await fetch(`${API_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(category)
    });
  }
}
```

**Should be:**
```typescript
import { apiClient } from './client';
import { API_BASE_URL } from '../config/api';

export const categoriesApi = {
  async getAll() {
    return apiClient('/api/categories');
  },
  async create(category: Category) {
    return apiClient('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category)
    });
  }
}
```

---

### 3. **lib/categories-store.ts Has Duplicate API_URL**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
```

Should import from centralized config.

---

### 4. **Hardcoded URLs in Admin Components**

**app/admin/page.tsx:39**
```typescript
const res = await fetch("http://localhost:8080/api/categories", {
```

**app/admin/components/SubcategoryEditor.tsx** (5 instances)
```typescript
fetch(`http://localhost:8080/api/gallery`)
fetch(`http://localhost:8080/api/gallery/upload`)
fetch(`http://localhost:8080/api/gallery/${imageId}`)
```

**app/admin/components/EditSubcategoryModal.tsx**
```typescript
fetch('http://localhost:8080/api/gallery/upload')
```

**app/admin/components/CategoryEditor.tsx**
```typescript
fetch(`http://localhost:8080/api/gallery/category/${cat.id}`)
```

**app/admin/components/GalleryAdminNew.tsx** (2 instances)
```typescript
fetch("http://localhost:8080/api/categories")
fetch(`http://localhost:8080/api/categories/${categories[i].id}`)
```

---

## ⚠️ Medium Priority

### 5. **TypeScript `any` Types**
**33 instances** of `any` type found across 15 files.

**Examples:**
- `app/admin/components/SubcategoryEditor.tsx` - 6 instances
- `app/api/admin/categories/[slug]/subcategories/[subSlug]/items/route.ts` - 4 instances
- `lib/api/categories.ts` - `category: any, token: string`
- `lib/api/availability.ts` - `blockedTime: any`

**Should define proper interfaces:**
```typescript
// Instead of:
async create(category: any, token: string)

// Use:
interface Category {
  name: string;
  slug: string;
  description?: string;
}

async create(category: Category)
```

---

### 6. **Manual Token Passing**
Some API functions still require manual token passing:

**lib/api/categories.ts:**
```typescript
async create(category: any, token: string) {
  // Manually adds token
  headers: { 'Authorization': `Bearer ${token}` }
}
```

**Should use `apiClient`** which automatically adds tokens.

---

### 7. **Inconsistent Error Handling**
Some files throw generic errors, others return error responses.

**Example in lib/api/categories.ts:**
```typescript
if (!response.ok) throw new Error('Failed to fetch categories');
```

**Should use `ApiError`:**
```typescript
if (!response.ok) {
  throw new ApiError('Failed to fetch categories', response.status);
}
```

---

### 8. **localStorage Usage in Non-Auth Files**
Files still directly accessing localStorage:

- `app/admin/components/HomePageEditor.tsx` - Hero video settings
- `app/admin/context/ThemeContext.tsx` - Theme preference
- `components/BlockTimeModal.tsx` - Token retrieval
- `components/BusinessHoursForm.tsx` - Token retrieval

**For auth tokens:** Should use `getAuthToken()`  
**For other data:** Consider creating utility functions

---

## ✅ Low Priority

### 9. **Environment Variable Naming**
Two different environment variable names used:
- `NEXT_PUBLIC_API_URL` (most common)
- `NEXT_PUBLIC_BACKEND_URL` (3 files)

**Recommendation:** Standardize on `NEXT_PUBLIC_API_URL`

---

### 10. **next.config.ts Proxy**
```typescript
destination: 'http://localhost:8080/Gallery/:path*',
```

Should use environment variable instead of hardcoded URL.

---

## 📋 Recommended Action Plan

### Phase 1: Critical Fixes (1-2 hours)
1. ✅ Fix `lib/api/categories.ts` to use `apiClient` and centralized config
2. ✅ Fix `lib/categories-store.ts` to use centralized config
3. ✅ Fix hardcoded URLs in admin components (8 files)
4. ✅ Update all API routes to use centralized config

### Phase 2: Type Safety (2-3 hours)
5. ✅ Define proper TypeScript interfaces for all `any` types
6. ✅ Remove manual token passing from API functions
7. ✅ Standardize error handling with `ApiError`

### Phase 3: Cleanup (1 hour)
8. ✅ Create utility for non-auth localStorage usage
9. ✅ Standardize environment variable names
10. ✅ Update next.config.ts to use env variable

---

## 🎯 Quick Wins (Do These Now)

### 1. Fix lib/api/categories.ts
```typescript
import { apiClient } from './client';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
}

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    return apiClient<Category[]>('/api/categories');
  },
  
  getById: async (id: number): Promise<Category> => {
    return apiClient<Category>(`/api/categories/${id}`);
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
  }
};
```

### 2. Create Shared Config for API Routes
```typescript
// lib/config/server-api.ts
export const SERVER_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
```

Then in API routes:
```typescript
import { SERVER_API_BASE_URL } from '@/lib/config/server-api';
```

---

## 📊 Impact Summary

**Current State:**
- ❌ 20+ files with duplicate API_URL definitions
- ❌ 8+ admin components with hardcoded URLs
- ❌ 33+ instances of `any` types
- ❌ Inconsistent error handling
- ❌ Manual token management in some APIs

**After Improvements:**
- ✅ Single source of truth for all API URLs
- ✅ Type-safe API calls throughout
- ✅ Consistent error handling
- ✅ Automatic token management
- ✅ Easier to maintain and test

**Estimated Time:** 4-6 hours total
**Estimated LOC Reduced:** ~200 lines of duplicate code
