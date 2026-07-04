import { NextResponse } from 'next/server';

// GET - Retrieve gallery collections from categories with flipping images
export async function GET() {
  try {
    // Fetch categories from backend (includes flippingImages)
    const response = await fetch('http://localhost:8080/api/categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    const categoriesData = await response.json();
    const categories = categoriesData.categories || [];
    
    // Extract flipping images from categories to create gallery collections
    const collections = categories.map((category: any) => {
      // Use actual flipping images from backend, or fallback to the category cover image
      const images: string[] = category.flippingImages && category.flippingImages.length > 0
        ? category.flippingImages
        : (category.image ? [category.image] : []);
      
      return {
        title: category.name,
        slug: category.slug,
        images: [...new Set(images.filter(Boolean))], // Remove duplicates and empty values
      };
    });
    
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
    
    // Fetch current categories to get their IDs
    const response = await fetch('http://localhost:8080/api/categories', {
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
        console.log(`Updating flipping images for category: ${category.name}`);
        console.log(`New images:`, updatedCollection.images);
        
        // Update the category's flipping images
        await fetch(`http://localhost:8080/api/categories/${category.id}/flipping-images`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(updatedCollection.images)
        });
      }
    }
    
    return NextResponse.json({ message: 'Flipping images updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving gallery collections updates:', error);
    return NextResponse.json({ error: 'Failed to save changes' }, { status: 500 });
  }
}
