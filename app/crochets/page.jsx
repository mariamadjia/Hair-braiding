import CategoryPageTemplate from '@/components/CategoryPageTemplate';

const crochetsCategories = [
  {
    name: 'Single',
    slug: 'single',
    image: '/Gallery/Crochets/Single/IMG_9381.jpg',
    images: [
      '/Gallery/Crochets/Single/IMG_9381.jpg',
      '/Gallery/Crochets/Single/IMG_9380.jpg',
      '/Gallery/Crochets/Single/IMG_9382.jpg',
    ],
  },
  {
    name: 'Pre-Braided',
    slug: 'pre-braided',
    image: '/Gallery/Crochets/pre-braided/IMG_9367.jpg',
    images: [
      '/Gallery/Crochets/pre-braided/IMG_9367.jpg',
      '/Gallery/Crochets/pre-braided/IMG_9372.jpg',
      '/Gallery/Crochets/pre-braided/IMG_9373.jpg',
      '/Gallery/Crochets/pre-braided/IMG_9374.jpg',
    ],
  },
  {
    name: 'Loose Hair',
    slug: 'loose-hair',
    image: '/Gallery/Crochets/Loose hair/IMG_9366.jpg',
    images: ['/Gallery/Crochets/Loose hair/IMG_9366.jpg'],
  },
  {
    name: 'Pre-Twisted',
    slug: 'pre-twisted',
    image: '/Gallery/Crochets/pre-twisted/IMG_9375.jpg',
    images: ['/Gallery/Crochets/pre-twisted/IMG_9375.jpg'],
  },
  {
    name: 'Half & Half Crochet with Braids',
    slug: 'half-half-crochet-braids',
    image: '/Gallery/Crochets/half&half crochet with braids/IMG_9383.jpg',
    images: [
      '/Gallery/Crochets/half&half crochet with braids/IMG_9383.jpg',
      '/Gallery/Crochets/half&half crochet with braids/IMG_9384.jpg',
    ],
  },
];

export default function CrochetsPage() {
  return (
    <CategoryPageTemplate
      categoryName="Crochets"
      categorySlug="crochets"
      subcategories={crochetsCategories}
    />
  );
}
