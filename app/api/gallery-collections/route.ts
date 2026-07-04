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

    // Fetch gallery images for all categories
    const galleryResponse = await fetch(`${API_URL}/api/gallery`, {
      cache: 'no-store'
    });
    const galleryImages = galleryResponse.ok ? await galleryResponse.json() : [];
    console.log('Gallery images count:', galleryImages.length);

    // Extract flipping images from categories to create gallery collections
    const collections = categories.map((category: any) => {
      console.log(`Processing category: ${category.name}, flippingImages:`, category.flippingImages, 'image:', category.image);

      // Get gallery images for this category
      const categoryImages = galleryImages.filter((img: any) => img.categoryId === category.id);
      const firstImage = categoryImages[0];

      // Use flipping images from backend, or fallback to first 5 gallery images, or category cover image
      let images: string[] = [];
      if (category.flippingImages && category.flippingImages.length > 0) {
        images = category.flippingImages;
      } else if (categoryImages.length > 0) {
        images = categoryImages.slice(0, 5).map((img: any) => img.imageUrl);
      } else if (category.image) {
        images = [category.image];
      }

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

    console.log('POST /api/gallery-collections received:', JSON.stringify(updatedCollections, null, 2));
    console.log('Auth header present:', !!authHeader);

    // Fetch current categories to get their IDs (need full data for IDs)
    const response = await fetch(`${API_URL}/api/categories`, {
      headers: { 'Authorization': authHeader }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const categoriesData = await response.json();
    const categories = categoriesData.categories || [];

    console.log('Fetched categories count:', categories.length);

    // Update each category's flipping images
    for (const updatedCollection of updatedCollections) {
      // Find matching category by slug or title
      const category = categories.find((cat: any) =>
        cat.slug === updatedCollection.slug || cat.name === updatedCollection.title
      );

      console.log(`Looking for category with slug: ${updatedCollection.slug}, title: ${updatedCollection.title}`);
      console.log(`Found category:`, category ? category.id : 'NOT FOUND');

      if (category) {
        // Convert proxy URLs back to backend URLs for saving
        const backendUrls = updatedCollection.images
          .map((url: string) => {
            if (url.includes('/api/proxy-image?url=')) {
              const urlParam = url.split('url=')[1];
              const decodedUrl = decodeURIComponent(urlParam);
              if (decodedUrl.includes('/api/gallery/image/')) {
                const filename = decodedUrl.split('/').pop();
                return `/Gallery/uploads/${filename}`;
              }
              return decodedUrl;
            }
            return url;
          })
          .filter((url: string) => url !== null && url !== '');

        console.log(`Updating category ${category.id} with images:`, backendUrls);

        // Update the category's flipping images
        const updateResponse = await fetch(`${API_URL}/api/categories/${category.id}/flipping-images`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(backendUrls)
        });

        console.log(`Update response status:`, updateResponse.status);

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`Failed to update category ${category.id}:`, errorText);
          console.error(`Update response status:`, updateResponse.status);
        } else {
          console.log(`Successfully updated category ${category.id}`);
        }
      }
    }

    return NextResponse.json({ message: 'Flipping images updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving gallery collections updates:', error);
    return NextResponse.json({ error: 'Failed to save changes' }, { status: 500 });
  }
}
