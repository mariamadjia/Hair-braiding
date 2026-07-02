import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Default fallback images - these will show when backend is down
const DEFAULT_HERO_IMAGES = [
  '/hero/default-1.jpg',
  '/hero/default-2.jpg',
  '/hero/default-3.jpg'
];

export async function GET() {
  try {
    // First, try to get hero images from gallery endpoint
    let backendAvailable = false;
    let backendImages: string[] = [];
    
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/gallery?isHero=true`, {
        cache: 'no-store' // Don't cache - always get fresh data
      });
      
      if (backendRes.ok) {
        backendAvailable = true;
        const data = await backendRes.json();
        
        // Extract imageUrl from gallery items and convert to new image serving endpoint
        if (Array.isArray(data) && data.length > 0) {
          backendImages = data.map((item: any) => {
            const imageUrl = item.imageUrl;
            // If it's a Gallery path, convert to new /api/gallery/image/ endpoint
            if (imageUrl && imageUrl.startsWith('/Gallery/uploads/')) {
              const filename = imageUrl.split('/').pop();
              return `${API_BASE_URL}/api/gallery/image/${filename}`;
            }
            // If it's a relative path, prepend backend URL
            if (imageUrl && imageUrl.startsWith('/')) {
              return `${API_BASE_URL}${imageUrl}`;
            }
            return imageUrl;
          });
          return NextResponse.json({ images: backendImages, source: 'backend' });
        }
      }
    } catch (backendError) {
      console.log('Backend unavailable, falling back to filesystem');
    }

    // Fallback: Use filesystem images when:
    // 1. Backend is DOWN, OR
    // 2. Backend is UP but has no images configured (empty array)
    const heroDirectory = path.join(process.cwd(), 'public', 'hero');
    if (fs.existsSync(heroDirectory)) {
      const files = fs.readdirSync(heroDirectory);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
      );
      
      if (imageFiles.length > 0) {
        const imagePaths = imageFiles.map(file => `/hero/${file}`);
        return NextResponse.json({ 
          images: imagePaths, 
          source: backendAvailable ? 'filesystem-fallback' : 'filesystem' 
        });
      }
    }

    // Final fallback: Return default placeholder images
    return NextResponse.json({ images: DEFAULT_HERO_IMAGES, source: 'default' });
  } catch (error) {
    console.error('Error reading hero images:', error);
    return NextResponse.json({ images: DEFAULT_HERO_IMAGES, source: 'default' });
  }
}
