import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { imagePath } = body;
    
    if (!imagePath) {
      return NextResponse.json({ error: 'No image path provided' }, { status: 400 });
    }

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization');

    // Find and delete the image from gallery by imageUrl
    try {
      // Convert the image URL back to database format for matching
      let dbImagePath = imagePath;
      if (imagePath.includes('/api/gallery/image/')) {
        const filename = imagePath.split('/').pop();
        dbImagePath = `/Gallery/uploads/${filename}`;
      } else if (imagePath.startsWith(`${API_BASE_URL}/Gallery/uploads/`)) {
        dbImagePath = imagePath.replace(`${API_BASE_URL}`, '');
      }

      // First, get all hero images to find the ID
      const galleryRes = await fetch(`${API_BASE_URL}/api/gallery?isHero=true`, {
        headers: authHeader ? { 'Authorization': authHeader } : {},
      });

      if (galleryRes.ok) {
        const galleryItems = await galleryRes.json();
        const imageToDelete = galleryItems.find((item: any) => item.imageUrl === dbImagePath);
        
        if (imageToDelete) {
          // Delete from gallery by ID
          const deleteRes = await fetch(`${API_BASE_URL}/api/gallery/${imageToDelete.id}`, {
            method: 'DELETE',
            headers: authHeader ? { 'Authorization': authHeader } : {},
          });

          if (!deleteRes.ok) {
            throw new Error('Failed to delete from backend');
          }
        }
      }
    } catch (backendError) {
      console.error('Failed to delete from backend:', backendError);
      return NextResponse.json({ 
        error: 'Failed to delete from backend',
        details: backendError instanceof Error ? backendError.message : 'Unknown error'
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ 
      error: 'Delete failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
