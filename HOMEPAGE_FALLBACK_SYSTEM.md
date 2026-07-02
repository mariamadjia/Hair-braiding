# Homepage Fallback System

## Overview
The homepage content (hero images, welcome videos) uses a **3-tier fallback system** to ensure the website remains functional even when the Spring Boot backend is down.

## Architecture

### Hero Section (Images)

**Priority Order:**
1. **Backend Database** (Spring Boot) - Admin-uploaded images via `/api/homepage-settings`
2. **Local Filesystem** - Images in `/public/hero/` directory
3. **Default Fallback** - Hardcoded default images in the component

**Flow:**
```
User visits homepage
    ↓
Next.js API route: /api/hero-images
    ↓
Try: Fetch from Spring Boot backend
    ↓ (if fails)
Try: Read from /public/hero/ directory
    ↓ (if fails)
Return: Default images array
    ↓
Hero component displays images
```

**Default Images:**
```javascript
const DEFAULT_HERO_IMAGES = [
  '/hero/default-1.jpg',
  '/hero/default-2.jpg',
  '/hero/default-3.jpg'
];
```

### Welcome Section (Videos)

**Priority Order:**
1. **Backend Database** (Spring Boot) - Admin-uploaded videos via `/api/homepage-settings`
2. **Default Fallback** - Hardcoded default videos in the component

**Default Videos:**
```javascript
const defaultItems = [
  { type: 'video', src: '/welcome/video1.MOV', label: 'Join us Today', link: '/join-us' },
  { type: 'video', src: '/welcome/video2.MOV', label: 'Book us now', link: '/services' },
  { type: 'video', src: '/welcome/video4.MOV', label: 'Explore gallery', link: '/gallery' }
];
```

## Benefits

✅ **High Availability**: Website works even if backend is down  
✅ **Graceful Degradation**: Falls back to defaults seamlessly  
✅ **No Broken Images**: Always shows something to users  
✅ **Admin Control**: Admins can override defaults via backend  
✅ **Performance**: Caches backend responses for 60 seconds

## Files Modified

### Backend (Spring Boot)
- `HomepageSettingsController.java` - Secured with authentication
- `HomepageSettingsService.java` - Uses DTO pattern
- `HomepageSettingsDTO.java` - Validation and data transfer
- `SecurityConfig.java` - GET is public, POST requires admin auth

### Frontend (Next.js)
- `/app/api/hero-images/route.ts` - 3-tier fallback system
- `/components/Hero.jsx` - Default images built-in
- `/components/Welcome.jsx` - Default videos built-in
- `/app/api/upload-hero-image/route.ts` - Forwards auth to backend
- `/app/api/delete-hero-image/route.ts` - Forwards auth to backend
- `/app/admin/components/HomePageEditor.tsx` - Sends auth tokens

## Setup Instructions

### 1. Add Default Images
Place default hero images in `/public/hero/`:
```
/public/hero/default-1.jpg
/public/hero/default-2.jpg
/public/hero/default-3.jpg
```

### 2. Add Default Videos
Place default welcome videos in `/public/welcome/`:
```
/public/welcome/video1.MOV
/public/welcome/video2.MOV
/public/welcome/video4.MOV
```

### 3. Backend Configuration
Ensure Spring Boot is running on `http://localhost:8080` or set:
```bash
NEXT_PUBLIC_API_URL=http://your-backend-url:8080
```

## Testing Fallback System

### Test Backend Fallback
1. Stop Spring Boot backend
2. Visit homepage
3. Should show default images/videos

### Test Filesystem Fallback
1. Stop Spring Boot backend
2. Delete `/public/hero/` directory
3. Visit homepage
4. Should still show hardcoded default images

### Test Admin Upload
1. Start Spring Boot backend
2. Login to admin panel
3. Upload new hero image
4. Image saves to both filesystem AND database
5. Public homepage shows new image immediately

## How Admin Uploads Work

1. **Admin uploads image** → Sent to `/api/upload-hero-image` with JWT token
2. **Next.js saves locally** → File saved to `/public/hero/`
3. **Next.js updates backend** → Forwards request to Spring Boot with auth
4. **Spring Boot validates** → Checks admin JWT token
5. **Database updated** → Image path saved to `homepage_settings` table
6. **Public sees change** → Next API route fetches from backend first

## Security

- **GET `/api/homepage-settings`** - Public (no auth required)
- **POST `/api/homepage-settings/**`** - Admin only (JWT required)
- **File uploads** - Admin authentication forwarded from Next.js to Spring Boot
- **Auth tokens** - Stored in localStorage/sessionStorage, sent with all admin requests

## Troubleshooting

**Images not uploading?**
- Check browser console for 401 errors
- Verify admin is logged in
- Check JWT token exists in localStorage

**Default images not showing?**
- Verify files exist in `/public/hero/` and `/public/welcome/`
- Check file paths match the hardcoded defaults
- Check browser console for 404 errors

**Backend changes not reflecting?**
- Clear Next.js cache: `rm -rf .next`
- Restart Next.js dev server
- Check API route is fetching from backend first
