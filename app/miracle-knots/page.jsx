import CategoryPageTemplate from '@/components/CategoryPageTemplate';

const miracleKnotsCategories = [
  {
    name: 'Miracle Weaves',
    slug: 'miracle-weaves',
    image: '/Gallery/Miracle-knots/Miracle-weaves/IMG_9365.jpg',
    images: [
      '/Gallery/Miracle-knots/Miracle-weaves/IMG_9365.jpg',
      '/Gallery/Miracle-knots/Miracle-weaves/IMG_9362.jpg',
    ],
  },
  {
    name: 'Magic Knots',
    slug: 'magic-knots',
    image: '/Gallery/Miracle-knots/Magic-knots/IMG_9355.jpg',
    images: [
      '/Gallery/Miracle-knots/Magic-knots/IMG_9355.jpg',
      '/Gallery/Miracle-knots/Magic-knots/IMG_9356.jpg',
      '/Gallery/Miracle-knots/Magic-knots/IMG_9354.jpg',
      '/Gallery/Miracle-knots/Magic-knots/IMG_9353.jpg',
    ],
  },
];

export default function MiracleKnotsPage() {
  return (
    <CategoryPageTemplate
      categoryName="Miracle Knots"
      categorySlug="miracle-knots"
      subcategories={miracleKnotsCategories}
    />
  );
}
