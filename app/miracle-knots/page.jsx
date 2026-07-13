import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategoryPageData } from '@/lib/categories-store';

export const dynamic = 'force-dynamic';

export default async function MiracleKnotsPage() {
  const { categoryName, categorySlug, subcategories } = await getCategoryPageData('miracle-knots');
  return (
    <CategoryPageTemplate
      categoryName={categoryName}
      categorySlug={categorySlug}
      subcategories={subcategories}
    />
  );
}
