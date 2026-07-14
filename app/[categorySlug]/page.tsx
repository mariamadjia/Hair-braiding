import { notFound } from 'next/navigation';
import CategoryPageTemplate from '@/components/CategoryPageTemplate';
import { getCategorySubcategories } from '@/lib/category-page-data';
import { API_BASE_URL } from '@/lib/config/api';

export const dynamic = 'force-dynamic';

async function getCategoryName(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/categories`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const cat = (data.categories ?? []).find((c: { slug: string; name: string }) => c.slug === slug);
    return cat?.name ?? null;
  } catch {
    return null;
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;
  const categoryName = await getCategoryName(categorySlug);

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
