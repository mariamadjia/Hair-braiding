# Media Migration Guide

## Problem
Your deployment exceeds Vercel's 250 MB serverless function limit due to large media files in the `public/` folder (303 MB total).

## Solution: Move to Cloud Storage

### Option 1: Vercel Blob Storage (Recommended)

**Pros:**
- Integrated with Vercel
- Easy to set up
- Automatic CDN distribution
- Pay-as-you-go pricing

**Setup:**
```bash
npm install @vercel/blob
```

**Pricing:** ~$0.15/GB storage + $0.30/GB bandwidth

### Option 2: Cloudinary (Best for Images/Videos)

**Pros:**
- Free tier: 25 GB storage, 25 GB bandwidth/month
- Automatic image optimization
- Video transformation
- Built-in CDN

**Setup:**
1. Sign up at https://cloudinary.com
2. Install SDK: `npm install cloudinary`
3. Upload existing media
4. Update image URLs in your code

### Option 3: AWS S3 + CloudFront

**Pros:**
- Very cheap storage (~$0.023/GB)
- Scalable
- Full control

**Cons:**
- More complex setup
- Requires AWS account

## Immediate Workaround: Exclude Large Files

### Step 1: Update .vercelignore

Add to `.vercelignore`:
```
# Large media files
public/Footer/*.mov
public/Gallery/**
public/welcome/*.MOV
public/welcome/*.mov
public/uploads/**
public/services/*.png
```

### Step 2: Serve from Backend or External URL

Update your code to fetch images from:
- Your backend API (if images are in backend storage)
- External CDN URL
- Cloud storage service

## Recommended Migration Path

1. **Immediate:** Add large files to `.vercelignore` to unblock deployment
2. **Short-term:** Upload critical images to Cloudinary free tier
3. **Long-term:** Implement proper media management with backend storage

## Files to Migrate (Priority Order)

1. **Videos** (72+ MB total):
   - `public/Footer/footer2.mov` (42 MB)
   - `public/welcome/*.MOV` (40+ MB)
   
2. **Gallery Images** (110+ MB):
   - `public/Gallery/Conrows` (38 MB)
   - `public/Gallery/Miracle-knots` (33 MB)
   - `public/Gallery/Twists` (19 MB)
   - `public/Gallery/Box-Braids` (17 MB)

3. **Uploads folder** (20+ MB):
   - `public/uploads/**`

4. **Service images** (20+ MB):
   - `public/services/*.png`

## Implementation Example (Cloudinary)

```typescript
// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function getImageUrl(publicId: string) {
  return cloudinary.url(publicId, {
    transformation: [
      { width: 1200, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });
}
```

Update image references:
```tsx
// Before
<img src="/Gallery/Twists/IMG_1585.JPG" />

// After
<img src={getImageUrl('gallery/twists/IMG_1585')} />
```
