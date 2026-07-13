import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategoryPageData } from '@/lib/categories-store';

export const dynamic = 'force-dynamic';

export default async function LocsPage() {
  const { categoryName, categorySlug, subcategories } = await getCategoryPageData('locs');
  return (
    <CategoryPageTemplate
      categoryName={categoryName}
      categorySlug={categorySlug}
      subcategories={subcategories}
    />
  );
}
