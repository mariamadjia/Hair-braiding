import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategorySubcategories } from '@/lib/category-page-data';

export const dynamic = 'force-dynamic';

export default async function LocsPage() {
  const subcategories = await getCategorySubcategories('locs');

  return (
    <CategoryPageTemplate
      categoryName="Locs"
      categorySlug="locs"
      subcategories={subcategories}
    />
  );
}
