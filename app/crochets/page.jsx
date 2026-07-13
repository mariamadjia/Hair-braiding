import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategorySubcategories } from '@/lib/category-page-data';

export const dynamic = 'force-dynamic';

export default async function CrochetsPage() {
  const subcategories = await getCategorySubcategories('crochets');

  return (
    <CategoryPageTemplate
      categoryName="Crochets"
      categorySlug="crochets"
      subcategories={subcategories}
    />
  );
}
