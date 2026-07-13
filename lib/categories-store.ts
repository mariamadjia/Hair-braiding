import type { CategoriesData, BookingCategory } from "./booking-types";
import { API_BASE_URL } from "./config/api";
import { toProxyUrl } from "./utils/image";

const API_URL = API_BASE_URL;

export async function readCategories(): Promise<CategoriesData> {
    try {
        const response = await fetch(`${API_URL}/api/categories`, {
            cache: "no-store",
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch categories: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Backend returns the full CategoriesData object
        if (data.categories && Array.isArray(data.categories)) {
            return {
                defaultBookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL || data.defaultBookingUrl || "",
                categories: data.categories
            };
        }
        
        // Fallback if data is just an array
        return {
            defaultBookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL || "",
            categories: Array.isArray(data) ? data : []
        };
    } catch (error) {
        console.error('Error fetching categories:', error);
        // Return empty data on error
        return {
            defaultBookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL || "",
            categories: []
        };
    }
}

export async function readBookingData(): Promise<BookingCategory[]> {
    try {
        const response = await fetch(`${API_URL}/api/booking`, {
            cache: "no-store",
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch booking data: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching booking data:', error);
        // Return empty array on error
        return [];
    }
}

export async function readBookingCategory(slug: string): Promise<BookingCategory | null> {
    try {
        console.log(`[readBookingCategory] Fetching: ${API_URL}/api/booking/${slug}`);
        const response = await fetch(
            `${API_URL}/api/booking/${encodeURIComponent(slug)}`,
            {
                // Admin service edits should be visible immediately on public booking pages.
                // Use no-store here because this endpoint is the source of truth for live pricing.
                cache: "no-store",
                signal: AbortSignal.timeout(15000),
            }
        );

        console.log(`[readBookingCategory] Response status: ${response.status}`);

        if (response.status === 404) {
            console.log(`[readBookingCategory] Category not found: ${slug}`);
            return null;
        }

        if (!response.ok) {
            // Throw so Next.js does NOT cache this as a 404 — it will retry on next request
            throw new Error(`Failed to fetch booking category: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[readBookingCategory] Success:`, data.name);
        return data;
    } catch (error) {
        console.error('[readBookingCategory] Error:', error);
        // Re-throw so Next.js does not cache a failed fetch as notFound()
        throw error;
    }
}

export async function readBookingSubcategory(categorySlug: string, subSlug: string) {
    const category = await readBookingCategory(categorySlug);
    if (!category) return { category: null, subcategory: null };

    const subcategory = (category.subcategories ?? []).find((sub) => sub.slug === subSlug) ?? null;
    return { category, subcategory };
}

export async function writeCategories(data: CategoriesData): Promise<void> {
    // This function is no longer needed since we're using the backend API
    // The admin panel updates the database directly
    console.warn('writeCategories is deprecated - use the admin API instead');
}

export async function getCategoryPageData(slug: string) {
    try {
        const [categoryRes, galleryRes] = await Promise.all([
            fetch(`${API_URL}/api/categories/slug/${encodeURIComponent(slug)}`, {
                cache: "no-store",
            }),
            fetch(`${API_URL}/api/gallery`, {
                cache: "no-store",
            }),
        ]);

        if (!categoryRes.ok) {
            throw new Error(`Failed to fetch category ${slug}: ${categoryRes.status}`);
        }

        const category = await categoryRes.json();
        const allGalleryImages = galleryRes.ok ? await galleryRes.json() : [];

        const subcategories = (category.subcategories || [])
            .map((sub: any) => {
                const subImages = allGalleryImages
                    .filter((img: any) => img.subcategoryId === sub.id)
                    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

                const rawImages =
                    subImages.length > 0
                        ? subImages.map((img: any) => img.imageUrl)
                        : Array.isArray(sub.images) && sub.images.length > 0
                            ? sub.images
                            : sub.image
                                ? [sub.image]
                                : [];

                return {
                    name: sub.name,
                    slug: sub.slug,
                    image: rawImages[0] ? toProxyUrl(rawImages[0]) : "",
                    images: rawImages.map((url: string) => toProxyUrl(url)),
                    displayOrder: sub.displayOrder || 0,
                };
            })
            .sort((a: any, b: any) => a.displayOrder - b.displayOrder);

        return {
            categoryName: category.name,
            categorySlug: category.slug,
            subcategories,
        };
    } catch (error) {
        console.error(`[getCategoryPageData] Error loading ${slug}:`, error);
        return {
            categoryName: slug,
            categorySlug: slug,
            subcategories: [],
        };
    }
}
