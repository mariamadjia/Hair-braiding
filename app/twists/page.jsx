'use client';

import { useEffect, useState } from 'react';
import CategoryPageTemplate from '@/components/CategoryPageTemplate';

export default function TwistsPage() {
  const [twistCategories, setTwistCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch category data
        const categoryRes = await fetch('http://localhost:8080/api/categories/slug/twists');
        const category = await categoryRes.json();

        // Fetch all images
        const imagesRes = await fetch('http://localhost:8080/api/gallery');
        const allImages = await imagesRes.json();

        // Filter images for this category
        const categoryImages = allImages.filter(img => img.categoryId === category.id);

        // Group by subcategory
        const subMap = {};
        categoryImages.forEach(img => {
          if (img.subcategoryId) {
            if (!subMap[img.subcategoryId]) {
              subMap[img.subcategoryId] = {
                name: img.subcategoryName,
                slug: img.subcategoryName.toLowerCase().replace(/\s+/g, '-'),
                image: img.imageUrl,
                displayOrder: img.subcategoryDisplayOrder || 0,
                images: []
              };
            }
            subMap[img.subcategoryId].images.push(img.imageUrl);
          }
        });

        // Sort by displayOrder
        const sortedSubcategories = Object.values(subMap).sort((a, b) => 
          (a.displayOrder || 0) - (b.displayOrder || 0)
        );
        setTwistCategories(sortedSubcategories);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600">Loading...</div>
      </div>
    );
  }

  return (
    <CategoryPageTemplate
      categoryName="Twists"
      categorySlug="twists"
      subcategories={twistCategories}
    />
  );
}
