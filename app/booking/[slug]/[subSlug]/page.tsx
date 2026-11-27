import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readBookingSubcategory } from "@/lib/categories-store";
import { toProxyUrl } from "@/lib/utils/image";
import SubcategoryPageClient from "./SubcategoryPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string; subSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, subSlug } = await params;
    const { category, subcategory } = await readBookingSubcategory(slug, subSlug);

    if (!category || !subcategory) {
        return { title: "Braiding service not found | AH Braiding" };
    }

    const categoryName = category.name.replace(/\s+styles?$/i, "").trim();
    const title = `${subcategory.name} ${categoryName} | AH Braiding`;
    const description = subcategory.summary?.trim()
        || `View ${subcategory.name} options, sizes, lengths, and prices. Book your ${subcategory.name} appointment with AH Braiding in San Antonio.`;
    const path = `/booking/${encodeURIComponent(slug)}/${encodeURIComponent(subSlug)}`;
    const sourceImage = subcategory.images?.[0]
        || subcategory.galleryImages?.[0]?.imageUrl
        || subcategory.image;
    const image = sourceImage ? toProxyUrl(sourceImage) : "/social/ah-braiding-cover.jpg";

    return {
        title: { absolute: title },
        description,
        alternates: { canonical: path },
        openGraph: {
            title,
            description,
            url: path,
            siteName: "AH Braiding",
            type: "website",
            images: [{ url: image, alt: `${subcategory.name} by AH Braiding` }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [image],
        },
    };
}

export default async function BookingSubcategoryPage({ params }: Props) {
    const { slug, subSlug } = await params;
    const { category, subcategory } = await readBookingSubcategory(slug, subSlug);
    if (!category || !subcategory) notFound();
    return <SubcategoryPageClient category={category} subcategory={subcategory} />;
}
