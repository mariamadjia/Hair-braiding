import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { imagePath } = body;
    
    if (!imagePath) {
      return NextResponse.json({ error: 'No image path provided' }, { status: 400 });
    }

    // Remove leading slash and construct full path
    const cleanPath = imagePath.replace(/^\//, '');
    const filepath = path.join(process.cwd(), 'public', cleanPath);

    // Delete file
    await unlink(filepath);

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization');

    // Update backend database to remove image
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/homepage-settings`, {
        method: 'GET',
        headers: authHeader ? { 'Authorization': authHeader } : {},
      });

      if (backendRes.ok) {
        const settings = await backendRes.json();
        const heroImages = settings.heroImages ? JSON.parse(settings.heroImages) : [];
        const updatedImages = heroImages.filter((img: string) => img !== imagePath);

        await fetch(`${API_BASE_URL}/api/homepage-settings/hero-images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { 'Authorization': authHeader } : {}),
          },
          body: JSON.stringify({ heroImages: JSON.stringify(updatedImages) }),
        });
      }
    } catch (backendError) {
      console.error('Failed to update backend:', backendError);
      // Continue anyway - file is deleted locally
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
