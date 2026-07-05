# Vercel Environment Variables for Production

## Required Environment Variables

Set these in your Vercel project settings under **Environment Variables** for production deployment:

### Backend Connection

```
BACKEND_API_URL=https://your-render-backend.onrender.com
```
- **Purpose**: Server-side backend URL for API routes
- **Used by**: `/app/api/gallery-collections/route.ts`, `/app/api/proxy-image/route.ts`
- **Note**: This is a server-only variable (not exposed to browser)

```
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
```
- **Purpose**: Client-side backend URL for browser components
- **Used by**: Client components that make direct API calls
- **Note**: `NEXT_PUBLIC_` prefix exposes this to the browser

### Optional Variables

```
NEXT_PUBLIC_BACKEND_URL=https://your-render-backend.onrender.com
```
- **Purpose**: Alternative backend URL used in some components
- **Used by**: Legacy components that reference this variable

```
NEXT_PUBLIC_BOOKING_URL=
```
- **Purpose**: External booking system URL (if applicable)
- **Used by**: Booking-related components

## Local Development Setup

For local development, create a `.env.local` file in the project root:

```env
BACKEND_API_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_BOOKING_URL=
```

## Important Notes

1. **Never commit `.env.local`** - it's already in `.gitignore`
2. **Use `.env.example`** as a template for required variables
3. **Backend URL must be HTTPS** in production (Render provides this automatically)
4. **Restart Vercel deployment** after adding environment variables for them to take effect

## Backend Requirements

Your Spring Boot backend must:

1. **Allow public access to gallery images**:
   ```java
   .requestMatchers(HttpMethod.GET, "/api/gallery/image/**").permitAll()
   .requestMatchers(HttpMethod.GET, "/api/categories/gallery").permitAll()
   .requestMatchers(HttpMethod.GET, "/api/gallery/category/**").permitAll()
   ```

2. **Return full image URLs** in the `flippingImages` array:
   ```json
   {
     "flippingImages": [
       "https://your-backend.onrender.com/api/gallery/image/image1.jpg",
       "https://your-backend.onrender.com/api/gallery/image/image2.jpg"
     ]
   }
   ```

3. **Support the enhanced gallery endpoint**:
   ```
   GET /api/categories/gallery?includeImages=true&limit=5
   ```

## Architecture Changes Made

The following architectural improvements have been implemented:

1. **Removed proxy layer for public images** - Gallery images now load directly from backend
2. **Single backend call** - Gallery collections fetch all data in one request (eliminated N+1 pattern)
3. **Server-side environment variable** - `BACKEND_API_URL` for API routes (not exposed to browser)
4. **Security hardening** - Proxy route now only allows requests to configured backend
5. **Lazy loading** - Gallery images use `loading="lazy"` for better performance
