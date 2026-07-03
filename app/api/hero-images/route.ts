import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Default fallback images - these will show when backend is down


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
        
        // Extract imageUrl from gallery items and convert to direct image serving endpoint
        if (Array.isArray(data) && data.length > 0) {
          backendImages = data.map((item: any) => {
            const imageUrl = item.imageUrl;
            // Convert Gallery path to direct image serving endpoint
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

    // Fallback: Return empty array when backend has no hero images configured
    // This forces the hero section to be empty instead of showing broken filesystem images
    return NextResponse.json({ images: [], source: 'none' });
  } catch (error) {
    console.error('Error reading hero images:', error);
    return NextResponse.json({ images: [], source: 'error' });
  }
}
