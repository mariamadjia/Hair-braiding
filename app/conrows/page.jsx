import CategoryPageTemplate from '@/components/CategoryPageTemplate';

const conrowsCategories = [
  {
    name: 'Feedin Conrows',
    slug: 'feedin-conrows',
    image: '/Gallery/Conrows/Feedin Conrows/IMG_9325.jpg',
    images: [
      '/Gallery/Conrows/Feedin Conrows/IMG_9325.jpg',
      '/Gallery/Conrows/Feedin Conrows/IMG_9324.jpg',
      '/Gallery/Conrows/Feedin Conrows/IMG_9323.jpg',
      '/Gallery/Conrows/Feedin Conrows/IMG_0112.JPG',
      '/Gallery/Conrows/Feedin Conrows/IMG_9304.jpg',
      '/Gallery/Conrows/Feedin Conrows/IMG_9305.jpg',
      '/Gallery/Conrows/Feedin Conrows/IMG_9310.jpg',
      '/Gallery/Conrows/Feedin Conrows/IMG_9311.jpg',
      '/Gallery/Conrows/Feedin Conrows/IMG_9312.jpg',
    ],
  },
  {
    name: 'Flip-Over Conrows',
    slug: 'flip-over-conrows',
    image: '/Gallery/Conrows/Flip-Over Conrows/IMG_9316.jpg',
    images: [
      '/Gallery/Conrows/Flip-Over Conrows/IMG_9316.jpg',
      '/Gallery/Conrows/Flip-Over Conrows/IMG_9317.jpg',
    ],
  },
  {
    name: 'Half-Half Conrows',
    slug: 'half-half-conrows',
    image: '/Gallery/Conrows/Half-Half Conrows/IMG_9303.jpg',
    images: [
      '/Gallery/Conrows/Half-Half Conrows/IMG_9303.jpg',
      '/Gallery/Conrows/Half-Half Conrows/IMG_9306.jpg',
      '/Gallery/Conrows/Half-Half Conrows/IMG_9307.jpg',
      '/Gallery/Conrows/Half-Half Conrows/IMG_9320.jpg',
      '/Gallery/Conrows/Half-Half Conrows/IMG_9321.jpg',
      '/Gallery/Conrows/Half-Half Conrows/IMG.JPEG',
    ],
  },
  {
    name: 'Straight Back',
    slug: 'straight-back',
    image: '/Gallery/Conrows/Straight Back/IMG_1593.JPG',
    images: [
      '/Gallery/Conrows/Straight Back/IMG_1593.JPG',
      '/Gallery/Conrows/Straight Back/IMG_9299.jpg',
      '/Gallery/Conrows/Straight Back/IMG_9300.jpg',
      '/Gallery/Conrows/Straight Back/IMG_9301.jpg',
    ],
  },
  {
    name: 'Updo Ponytail',
    slug: 'updo-ponytail',
    image: '/Gallery/Conrows/Updo Ponytail/IMG_9297.JPG',
    images: [
      '/Gallery/Conrows/Updo Ponytail/IMG_2688.JPG',
      '/Gallery/Conrows/Updo Ponytail/IMG_1296.JPG',
      '/Gallery/Conrows/Updo Ponytail/IMG_1556.JPG',
      '/Gallery/Conrows/Updo Ponytail/IMG_1570.JPG',
      '/Gallery/Conrows/Updo Ponytail/IMG_1594.JPG',
      '/Gallery/Conrows/Updo Ponytail/IMG_9295.jpg',
      '/Gallery/Conrows/Updo Ponytail/IMG_9296.jpg',
      '/Gallery/Conrows/Updo Ponytail/IMG_9297.jpg',
      '/Gallery/Conrows/Updo Ponytail/IMG_9308.jpg',
      '/Gallery/Conrows/Updo Ponytail/IMG_9309.jpg',
    ],
  },
];

export default function ConrowsPage() {
  return (
    <CategoryPageTemplate
      categoryName="Conrows"
      categorySlug="conrows"
      subcategories={conrowsCategories}
    />
  );
}
