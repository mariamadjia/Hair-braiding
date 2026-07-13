import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategorySubcategories } from '@/lib/category-page-data';

export const dynamic = 'force-dynamic';

export default async function BoxBraidsPage() {
  const subcategories = await getCategorySubcategories('box-braids');

  return (
    <CategoryPageTemplate
      categoryName="Box Braids"
      categorySlug="box-braids"
      subcategories={subcategories}
    />
  );
}
