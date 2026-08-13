import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';
const NORMALIZED_API_BASE_URL = API_BASE_URL.replace(/\/+$/, '');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Security: Only allow requests to the configured backend
    const allowedBase = NORMALIZED_API_BASE_URL;
    let targetUrl = imageUrl;

    // Convert Gallery path to new image serving endpoint
    if (imageUrl.startsWith('/Gallery/uploads/')) {
      const filename = imageUrl.split('/').pop();
      targetUrl = `${NORMALIZED_API_BASE_URL}/api/gallery/image/${filename}`;
    } else if (!imageUrl.startsWith('http')) {
      targetUrl = `${NORMALIZED_API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    const allowedUrl = new URL(allowedBase);
    const parsedTarget = new URL(targetUrl);
    const allowedPath = parsedTarget.pathname.startsWith('/api/gallery/image/')
      || parsedTarget.pathname.startsWith('/uploads/');
    if (parsedTarget.origin !== allowedUrl.origin || !allowedPath) {
      console.error('Invalid image URL:', targetUrl);
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    // Get auth token from request headers (if user is logged in)
    const authHeader = request.headers.get('authorization');
    
    // Prepare headers - try without auth first for public images
    const headers: HeadersInit = {};

    // Only add authentication if available (for private images)
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Fetch the image from backend
    const imageResponse = await fetch(targetUrl, {
      headers,
      signal: AbortSignal.timeout(15_000),
      cache: 'force-cache',
    });

    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', targetUrl, imageResponse.status);
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: imageResponse.status });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Upstream response is not an image' }, { status: 502 });
    }

    // Return the image with proper headers
    // Stream the upstream body instead of buffering multi-megabyte originals
    // in the serverless function before sending the first byte.
    return new NextResponse(imageResponse.body, {
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
