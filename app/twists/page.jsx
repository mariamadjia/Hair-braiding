import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategorySubcategories } from '@/lib/category-page-data';

export const dynamic = 'force-dynamic';

export default async function TwistsPage() {
  const subcategories = await getCategorySubcategories('twists');

  return (
    <CategoryPageTemplate
      categoryName="Twists"
      categorySlug="twists"
      subcategories={subcategories}
    />
  );
}
