import { notFound } from 'next/navigation';
import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategorySubcategories } from '@/lib/category-page-data';

export const dynamic = 'force-dynamic';

const CATEGORY_NAMES: Record<string, string> = {
  'box-braids':    'Box Braids',
  'conrows':       'Conrows',
  'crochets':      'Crochets',
  'locs':          'Locs',
  'men':           'Men',
  'miracle-knots': 'Miracle Knots',
  'twists':        'Twists',
};

export async function generateStaticParams() {
  return Object.keys(CATEGORY_NAMES).map((slug) => ({ categorySlug: slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;
  const categoryName = CATEGORY_NAMES[categorySlug];

  if (!categoryName) {
    notFound();
  }

  const subcategories = await getCategorySubcategories(categorySlug);

  return (
    <CategoryPageTemplate
      categoryName={categoryName}
      categorySlug={categorySlug}
      subcategories={subcategories}
    />
  );
}
