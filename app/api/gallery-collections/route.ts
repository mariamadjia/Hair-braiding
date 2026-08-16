import { NextResponse } from 'next/server';

const API_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

export const dynamic = 'force-dynamic';

// GET - Retrieve gallery collections from categories with flipping images
export async function GET(request: Request) {
  try {
    if (new URL(request.url).searchParams.get('view') === 'full') {
      const galleryResponse = await fetch(`${API_URL}/api/categories/gallery`, {
        cache: 'no-store',
      });
      if (!galleryResponse.ok) {
        return NextResponse.json(
          { error: 'The gallery is temporarily unavailable' },
          { status: galleryResponse.status },
        );
      }
      return NextResponse.json(await galleryResponse.json(), {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    // Keep the homepage collection synchronized with Gallery Management.
    // Backend cache eviction cannot invalidate a separate Vercel data cache.
    const [response, settingsResponse] = await Promise.all([
      fetch(`${API_URL}/api/categories/gallery-cards`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/homepage-settings`, { cache: 'no-store' }),
    ]);
    if (!response.ok) {
      console.error('Backend gallery endpoint failed:', response.status);
      throw new Error('Failed to fetch categories');
    }

    const categories = await response.json();
    let featuredIds: number[] = [];
    try {
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        const parsed = JSON.parse(settings.galleryCollections || '[]');
        if (Array.isArray(parsed)) {
          featuredIds = parsed.map(Number).filter(Number.isFinite);
        }
      }
    } catch (error) {
      console.error('Failed to load featured gallery selection:', error);
    }
    // Transform categories to collections format
    const mappedCollections = categories
      .map((category: any) => {
        const imageUrls =
          category.flippingImages?.length > 0
            ? category.flippingImages
            : category.fallbackImages ?? [];

        return {
          id: category.id,
          title: category.name,
          slug: category.slug,
          images: [...new Set(imageUrls)], // Remove duplicates
        };
      })
      .filter((collection: any) => collection.images.length > 0);

    const collections = featuredIds.length > 0
      ? featuredIds
          .map((id) => mappedCollections.find((collection: any) => collection.id === id))
          .filter(Boolean)
          .slice(0, 4)
      : mappedCollections.slice(0, 4);

    return NextResponse.json(
      { collections },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    );
  } catch (error) {
    console.error('Error fetching gallery collections:', error);
    return NextResponse.json(
      { collections: [], error: 'The gallery is temporarily unavailable' },
      { status: 503 }
    );
  }
}

// POST - Update category flipping images from homepage editor
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';

    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collections: updatedCollections } = await request.json();
    if (!Array.isArray(updatedCollections) || updatedCollections.length > 20) {
      return NextResponse.json({ error: 'Invalid gallery collections payload' }, { status: 400 });
    }

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
        // Images are now direct backend URLs, no conversion needed
        const backendUrls = updatedCollection.images.filter((url: string) => url !== null && url !== '');

        if (backendUrls.length > 5) {
          return NextResponse.json({ error: `A maximum of 5 images is allowed for ${category.name}` }, { status: 400 });
        }

        // Update the category's flipping images
        const updateResponse = await fetch(`${API_URL}/api/categories/${category.id}/flipping-images`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(backendUrls)
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`Failed to update category ${category.id}:`, errorText);
          return NextResponse.json(
            {
              error: `Failed to update category ${category.name}`,
              details: errorText,
            },
            { status: updateResponse.status }
          );
        }
      } else {
        return NextResponse.json({ error: 'A selected gallery category no longer exists' }, { status: 409 });
      }
    }

    return NextResponse.json({ message: 'Flipping images updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving gallery collections updates:', error);
    return NextResponse.json({ error: 'Failed to save changes' }, { status: 500 });
  }
}
