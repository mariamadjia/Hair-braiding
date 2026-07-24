import { redirect } from 'next/navigation';

export default async function LegacyGalleryCategoryPage({ params }) {
  const { slug } = await params;
  redirect(`/${encodeURIComponent(slug)}`);
}
