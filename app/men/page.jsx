import CategoryPageTemplate from '@/components/CategoryPageTemplate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function getMenData() {
  try {
    const [categoriesRes, galleryRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/categories`, { cache: 'no-store' }),
      fetch(`${API_BASE_URL}/api/gallery`, { cache: 'no-store' })
    ]);
    
    const categoriesData = await categoriesRes.json();
    const galleryImages = await galleryRes.json();
    
    // Find Men category
    const menCategory = categoriesData.categories?.find(cat => cat.slug === 'men' || cat.slug === 'mens');
    
    if (!menCategory) {
      return [];
    }
    
    // Map subcategories with gallery images and sort by displayOrder
    const subcategories = (menCategory.subcategories || [])
      .map(sub => {
        const subImages = galleryImages
          .filter(img => img.subcategoryId === sub.id)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        
        return {
          name: sub.name,
          slug: sub.slug,
          image: sub.image || (subImages[0] ? subImages[0].imageUrl : null),
          images: subImages.length > 0 ? subImages.map(img => img.imageUrl) : (sub.image ? [sub.image] : []),
          displayOrder: sub.displayOrder || 0
        };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
    
    return subcategories;
  } catch (error) {
    console.error('Failed to fetch men data:', error);
    return [];
  }
}

export default async function MenPage() {
  const subcategories = await getMenData();
  
  return (
    <CategoryPageTemplate
      categoryName="Men"
      categorySlug="men"
      subcategories={subcategories}
    />
  );
}
