import { API_BASE_URL } from "./config/api";

export type CategoryPageSubcategory = {
  name: string;
  slug: string;
  image: string | null;
  images: string[];
  displayOrder: number;
};

export async function getCategorySubcategories(
  slug: string
): Promise<CategoryPageSubcategory[]> {
  try {
    const [categoriesRes, galleryRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/categories`, { cache: "no-store" }),
      fetch(`${API_BASE_URL}/api/gallery`, { cache: "no-store" }),
    ]);

    if (!categoriesRes.ok || !galleryRes.ok) {
      throw new Error("Failed to fetch category data");
    }

    const categoriesData = await categoriesRes.json();
    const galleryImages = await galleryRes.json();

    const category = categoriesData.categories?.find(
      (cat: any) => cat.slug === slug
    );

    if (!category) {
      return [];
    }

    return (category.subcategories || [])
      .map((sub: any) => {
        const subImages = galleryImages
          .filter((img: any) => img.subcategoryId === sub.id)
          .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

        return {
          name: sub.name,
          slug: sub.slug,
          image:
            (subImages[0] ? subImages[0].imageUrl : null) || sub.image || null,
          images:
            subImages.length > 0
              ? subImages.map((img: any) => img.imageUrl)
              : sub.image
                ? [sub.image]
                : [],
          displayOrder: sub.displayOrder || 0,
        };
      })
      .sort((a: any, b: any) => a.displayOrder - b.displayOrder);
  } catch (error) {
    console.error(`Failed to fetch category ${slug}:`, error);
    return [];
  }
}
