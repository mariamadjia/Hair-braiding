import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Helper function to convert image URLs to proxy endpoint for authentication
const toProxyUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '';
  // If already a proxy URL, return as is
  if (imageUrl.includes('/api/proxy-image?url=')) return imageUrl;
  // If it's a Gallery path, convert to proxy
  if (imageUrl.startsWith('/Gallery/uploads/')) {
    const filename = imageUrl.split('/').pop();
    return `/api/proxy-image?url=${encodeURIComponent(`${API_URL}/api/gallery/image/${filename}`)}`;
  }
  // If it's already a full URL with the backend, convert to proxy
  if (imageUrl.startsWith(API_URL)) {
    return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  }
  // Otherwise return as is (local public assets)
  return imageUrl;
};

// GET - Retrieve gallery collections from categories with flipping images
export async function GET() {
  try {
    // Fetch categories from backend using the lightweight gallery endpoint
    const response = await fetch(`${API_URL}/api/categories/gallery`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      console.error('Backend gallery endpoint failed:', response.status);
      throw new Error('Failed to fetch categories');
    }

    const categories = await response.json();
    console.log('Gallery categories response:', JSON.stringify(categories, null, 2));

    // Extract flipping images from categories to create gallery collections
    const collections = categories.map((category: any) => {
      console.log(`Processing category: ${category.name}, flippingImages:`, category.flippingImages, 'image:', category.image);

      // Use actual flipping images from backend, or fallback to the category cover image
      const images: string[] = category.flippingImages && category.flippingImages.length > 0
        ? category.flippingImages
        : (category.image ? [category.image] : []);

      console.log(`Images for ${category.name}:`, images);

      // Convert backend URLs to proxy URLs for proper authentication
      const proxyImages = images.map(toProxyUrl).filter(Boolean);

      console.log(`Proxy images for ${category.name}:`, proxyImages);

      return {
        title: category.name,
        slug: category.slug,
        images: [...new Set(proxyImages)], // Remove duplicates
      };
    });

    console.log('Final collections:', JSON.stringify(collections, null, 2));

    return NextResponse.json({ collections: collections.slice(0, 4) });
  } catch (error) {
    console.error('Error fetching gallery collections:', error);
    return NextResponse.json({ collections: [] });
  }
}

// POST - Update category flipping images from homepage editor
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const { collections: updatedCollections } = await request.json();

    // Fetch current categories to get their IDs (need full data for IDs)
    const response = await fetch(`${API_URL}/api/categories`, {
      headers: { 'Authorization': authHeader }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const categoriesData = await response.json();
    const categories = categoriesData.categories || [];

    // Update each category's flipping images
    for (const updatedCollection of updatedCollections) {
      // Find matching category by slug or title
      const category = categories.find((cat: any) =>
        cat.slug === updatedCollection.slug || cat.name === updatedCollection.title
      );

      if (category) {
        // Update the category's flipping images
        const updateResponse = await fetch(`${API_URL}/api/categories/${category.id}/flipping-images`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(updatedCollection.images)
        });

        if (!updateResponse.ok) {
          console.error(`Failed to update category ${category.id}`);
        }
      }
    }

    return NextResponse.json({ message: 'Flipping images updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving gallery collections updates:', error);
    return NextResponse.json({ error: 'Failed to save changes' }, { status: 500 });
  }
}
