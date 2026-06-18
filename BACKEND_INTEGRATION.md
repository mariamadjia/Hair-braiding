# Backend Integration Complete

## Overview
The frontend now fetches all category data from the Spring Boot backend API instead of the local JSON file.

## Changes Made

### Backend (Spring Boot)
1. **ServiceItemController** - Created `/api/services` endpoints
2. **ServiceItemService** - Service layer for service items
3. **CategoryController** - Added `/api/categories/reorder` endpoint
4. **CategoryService** - Added `reorderCategories()` method

### Frontend (Next.js)

#### API Client
- **`lib/api/categories.ts`** - New API client for categories

#### Admin API Routes (Proxy to Backend)
- **`app/api/admin/categories/route.ts`** - Proxies GET/POST to backend
- **`app/api/admin/categories/[slug]/route.ts`** - Proxies PUT/DELETE to backend

#### Public Components
- **`components/Services.jsx`** - Now fetches from backend API

#### Admin Components
- **`app/admin/components/RootEditor.tsx`** - Drag-and-drop reordering with backend sync
- **`lib/booking-types.ts`** - Added `id` fields to types

## API Endpoints

### Backend (http://localhost:8080)
```
GET    /api/categories              - Get all categories
GET    /api/categories/{id}         - Get category by ID
GET    /api/categories/slug/{slug}  - Get category by slug
POST   /api/categories              - Create category
PUT    /api/categories/{id}         - Update category
DELETE /api/categories/{id}         - Delete category
POST   /api/categories/reorder      - Reorder categories (accepts array of IDs)

GET    /api/services                - Get all services
GET    /api/services/{id}           - Get service by ID
GET    /api/services/category/{id}  - Get services by category
POST   /api/services                - Create service
PUT    /api/services/{id}           - Update service
DELETE /api/services/{id}           - Delete service
```

### Frontend (http://localhost:3000)
```
GET    /api/admin/categories        - Proxy to backend (requires auth)
POST   /api/admin/categories        - Proxy to backend (requires auth)
PUT    /api/admin/categories/{slug} - Proxy to backend (requires auth)
DELETE /api/admin/categories/{slug} - Proxy to backend (requires auth)
```

## Drag-and-Drop Reordering

### How It Works
1. Admin drags a category to a new position
2. Frontend calculates new order
3. Calls `/api/categories/reorder` with array of category IDs
4. Backend updates `displayOrder` for each category
5. Frontend refreshes data from backend
6. Both admin panel and public site show updated order

### Visual Feedback
- Grip icon appears on hover
- Dragged item becomes semi-transparent
- Drop zone shows border indicator

## Data Flow

### Before (Local JSON)
```
Frontend → data/categories.json ← Admin Panel
```

### After (Backend API)
```
Frontend → Backend API ← Admin Panel
           (PostgreSQL)
```

## Environment Variables

Make sure to set in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Testing

1. Start backend: `cd Backend-Braiding && ./mvnw spring-boot:run`
2. Start frontend: `cd braiding-shop && npm run dev`
3. Visit http://localhost:3000/services - should show categories from database
4. Visit http://localhost:3000/admin - drag categories to reorder
5. Refresh public page - order should match admin panel

## Migration Notes

The local `data/categories.json` file is no longer used. All data now comes from the PostgreSQL database via the Spring Boot backend.

To populate the database with initial data, you can:
1. Use the admin panel to create categories manually
2. Import data via SQL scripts
3. Create a data migration endpoint
