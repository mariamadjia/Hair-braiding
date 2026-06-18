import CategoryPageTemplate from '@/components/CategoryPageTemplate';

const boxBraidsCategories = [
  {
    name: 'Classic Box Braids',
    slug: 'classic-box-braids',
    image: '/Gallery/Box-Braids /Box-Braids/IMG_9176.jpg',
    images: [
      '/Gallery/Box-Braids /Box-Braids/IMG_9176.jpg',
      '/Gallery/Box-Braids /Box-Braids/IMG_9178.jpg',
      '/Gallery/Box-Braids /Box-Braids/IMG_9179.jpg',
      '/Gallery/Box-Braids /Box-Braids/IMG_9183.jpg',
    ],
  },
  {
    name: 'Knotless',
    slug: 'knotless',
    image: '/Gallery/Box-Braids /knotless/IMG_9219.jpg',
    images: [
      '/Gallery/Box-Braids /knotless/IMG_9219.jpg',
      '/Gallery/Box-Braids /knotless/IMG_9220.jpg',
      '/Gallery/Box-Braids /knotless/IMG_9221.jpg',
      '/Gallery/Box-Braids /knotless/IMG_9222.jpg',
      '/Gallery/Box-Braids /knotless/IMG_9223.jpg',
    ],
  },
  {
    name: 'Goddess Braids',
    slug: 'goddess-braids',
    image: '/Gallery/Box-Braids /goddess braids/IMG_9174.jpg',
    images: [
      '/Gallery/Box-Braids /goddess braids/IMG_9174.jpg',
      '/Gallery/Box-Braids /goddess braids/IMG_9175.jpg',
      '/Gallery/Box-Braids /goddess braids/IMG_9180.jpg',
      '/Gallery/Box-Braids /goddess braids/IMG_9220.jpg',
    ],
  },
  {
    name: 'Bohemian French Curl',
    slug: 'bohemian-french-curl',
    image: '/Gallery/Box-Braids /Bohemian french curl/IMG_9190.jpg',
    images: [
      '/Gallery/Box-Braids /Bohemian french curl/IMG_9190.jpg',
      '/Gallery/Box-Braids /Bohemian french curl/IMG_9191.jpg',
      '/Gallery/Box-Braids /Bohemian french curl/IMG_9199.jpg',
    ],
  },
  {
    name: 'French Curls',
    slug: 'french-curls',
    image: '/Gallery/Box-Braids /French curls/IMG_7654.JPEG',
    images: ['/Gallery/Box-Braids /French curls/IMG_7654.JPEG'],
  },
  {
    name: 'Bohemian',
    slug: 'bohemian',
    image: '/Gallery/Box-Braids /Bohemian/IMG_9207.jpg',
    images: [
      '/Gallery/Box-Braids /Bohemian/IMG_9207.jpg',
      '/Gallery/Box-Braids /Bohemian/IMG_9208.jpg',
      '/Gallery/Box-Braids /Bohemian/IMG_9213.jpg',
      '/Gallery/Box-Braids /Bohemian/IMG_9214.jpg',
      '/Gallery/Box-Braids /Bohemian/IMG_9216.jpg',
    ],
  },
  {
    name: 'Bora Bora',
    slug: 'bora-bora',
    image: '/Gallery/Box-Braids /bora bora/IMG_9180.jpg',
    images: [
      '/Gallery/Box-Braids /bora bora/IMG_9180.jpg',
      '/Gallery/Box-Braids /bora bora/IMG_9181.jpg',
      '/Gallery/Box-Braids /bora bora/IMG_9189.jpg',
      '/Gallery/Box-Braids /bora bora/IMG_9190.jpg',
      '/Gallery/Box-Braids /bora bora/IMG_9191.jpg',
    ],
  },
];

export default function BoxBraidsPage() {
  return (
    <CategoryPageTemplate
      categoryName="Box Braids"
      categorySlug="box-braids"
      subcategories={boxBraidsCategories}
    />
  );
}
