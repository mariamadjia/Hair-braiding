import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const BACKEND_API_KEY = process.env.BACKEND_API_KEY; // Backend API key for public image access

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Get auth token from request headers (if user is logged in)
    const authHeader = request.headers.get('authorization');
    
    // Convert Gallery path to new image serving endpoint
    let targetUrl = imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`;
    if (imageUrl.startsWith('/Gallery/uploads/')) {
      const filename = imageUrl.split('/').pop();
      targetUrl = `${API_BASE_URL}/api/gallery/image/${filename}`;
    }
    
    // Prepare headers - try without auth first for public images
    const headers: HeadersInit = {};

    // Only add authentication if available (for private images)
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Fetch the image from backend
    const imageResponse = await fetch(targetUrl, { headers });

    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', targetUrl, imageResponse.status);
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: imageResponse.status });
    }

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
