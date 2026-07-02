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
    // First, try to get images from Spring Boot backend
    let backendAvailable = false;
    let backendImages: string[] = [];
    
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/homepage-settings`, {
        cache: 'no-store' // Don't cache - always get fresh data
      });
      
      if (backendRes.ok) {
        backendAvailable = true;
        const data = await backendRes.json();
        if (data.heroImages) {
          backendImages = JSON.parse(data.heroImages);
          
          // If backend has images configured, use ONLY those
          if (backendImages.length > 0) {
            return NextResponse.json({ images: backendImages, source: 'backend' });
          }
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
