import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategorySubcategories } from '@/lib/category-page-data';

export const dynamic = 'force-dynamic';

export default async function ConrowsPage() {
  const subcategories = await getCategorySubcategories('conrows');

  return (
    <CategoryPageTemplate
      categoryName="Conrows"
      categorySlug="conrows"
      subcategories={subcategories}
    />
  );
}
