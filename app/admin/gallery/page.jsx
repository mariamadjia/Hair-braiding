'use client';

import { useRouter } from 'next/navigation';
import GalleryPage from '@/app/gallery/page';

export default function AdminGalleryPage() {
  const router = useRouter();

  const handleEdit = (item) => {
    const categorySlug = item.slug || item.link?.replace(/^\/+/, '');
    if (!categorySlug) return;

    router.push(`/admin?section=categories&category=${encodeURIComponent(categorySlug)}`);
  };

  return <GalleryPage editMode onEdit={handleEdit} />;
}
