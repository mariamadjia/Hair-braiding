import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readBookingCategory } from "@/lib/categories-store";
import { toProxyUrl } from "@/lib/utils/image";
import CategoryPageClient from "./CategoryPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const category = await readBookingCategory(slug).catch(() => null);
    if (!category) return { title: "Braiding services | AH Braiding" };

    const categoryName = category.name.replace(/\s+styles?$/i, "").trim();
    const title = `${categoryName} Styles | AH Braiding`;
    const description = category.summary?.trim()
        || `Explore ${categoryName} styles, prices, sizes, and lengths. Book your appointment with AH Braiding in San Antonio.`;
    const path = `/booking/${encodeURIComponent(slug)}`;
    const sourceImage = category.flippingImages?.[0] || category.image;
    const image = sourceImage ? toProxyUrl(sourceImage) : "/social/ah-braiding-cover.jpg";

    return {
        title: { absolute: title },
        description,
        alternates: { canonical: path },
        openGraph: { title, description, url: path, siteName: "AH Braiding", type: "website", images: [{ url: image, alt: `${categoryName} styles at AH Braiding` }] },
        twitter: { card: "summary_large_image", title, description, images: [image] },
    };
}

export default async function BookingCategoryPage({ params }: Props) {
    const { slug } = await params;

    let category;
    try {
        category = await readBookingCategory(slug);
    } catch {
        // Backend timeout or error — don't cache as 404, show error
        notFound();
    }

    if (!category) {
        notFound();
    }

    return <CategoryPageClient category={category} />;
}
