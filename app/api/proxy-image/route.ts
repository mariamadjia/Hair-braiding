import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Get auth token from request headers (if user is logged in)
    const authHeader = request.headers.get('authorization');
    
    // Fetch the image from backend with auth
    const imageResponse = await fetch(
      imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`,
      {
        headers: authHeader ? { 'Authorization': authHeader } : {},
      }
    );

    if (!imageResponse.ok) {
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
