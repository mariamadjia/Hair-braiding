import { NextResponse } from 'next/server';

const API_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

// GET - Retrieve gallery collections from categories with flipping images
export async function GET() {
  try {
    // Fetch categories with images from backend in a single call
    const response = await fetch(`${API_URL}/api/categories/gallery?includeImages=true&limit=5`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      console.error('Backend gallery endpoint failed:', response.status);
      throw new Error('Failed to fetch categories');
    }

    const categories = await response.json();
    console.log('Gallery categories response:', JSON.stringify(categories, null, 2));

    // Transform categories to collections format
    const collections = categories.map((category: any) => {
      console.log(`Processing category: ${category.name}, id: ${category.id}, flippingImages:`, category.flippingImages);

      // Use flipping images from backend if available, otherwise empty array
      const images = category.flippingImages || [];

      console.log(`Images for ${category.name}:`, images);

      return {
        title: category.name,
        slug: category.slug,
        images: [...new Set(images)], // Remove duplicates
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
        // Images are now direct backend URLs, no conversion needed
        const backendUrls = updatedCollection.images.filter((url: string) => url !== null && url !== '');

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
