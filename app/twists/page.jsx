import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategoryPageData } from '@/lib/categories-store';

export const dynamic = 'force-dynamic';

export default async function TwistsPage() {
  const { categoryName, categorySlug, subcategories } = await getCategoryPageData('twists');
  return (
    <CategoryPageTemplate
      categoryName={categoryName}
      categorySlug={categorySlug}
      subcategories={subcategories}
    />
  );
}
