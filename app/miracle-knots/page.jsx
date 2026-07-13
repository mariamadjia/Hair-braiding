import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategorySubcategories } from '@/lib/category-page-data';

export const dynamic = 'force-dynamic';

export default async function MiracleKnotsPage() {
  const subcategories = await getCategorySubcategories('miracle-knots');

  return (
    <CategoryPageTemplate
      categoryName="Miracle Knots"
      categorySlug="miracle-knots"
      subcategories={subcategories}
    />
  );
}
