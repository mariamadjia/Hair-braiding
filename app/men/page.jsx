import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategorySubcategories } from '@/lib/category-page-data';

export const dynamic = 'force-dynamic';

export default async function MenPage() {
  const subcategories = await getCategorySubcategories('men');

  return (
    <CategoryPageTemplate
      categoryName="Men"
      categorySlug="men"
      subcategories={subcategories}
    />
  );
}
