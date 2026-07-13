import CategoryPageTemplate from '@/components/CategoryPageTemplate';

const locsCategories = [
  {
    name: 'Butterfly',
    slug: 'butterfly',
    image: '/Gallery/Locs/Butterfly/IMG_9387.jpg',
    images: [
      '/Gallery/Locs/Butterfly/IMG_9387.jpg',
    ],
  },
  {
    name: 'Soft',
    slug: 'soft',
    image: '/Gallery/Locs/Soft/IMG_9385.jpg',
    images: [
      '/Gallery/Locs/Soft/IMG_9385.jpg',
      '/Gallery/Locs/Soft/IMG_9386.jpg',
    ],
  },
];

export default function LocsPage() {
  return (
    <CategoryPageTemplate
      categoryName="Locs"
      categorySlug="locs"
      subcategories={locsCategories}
    />
  );
}
