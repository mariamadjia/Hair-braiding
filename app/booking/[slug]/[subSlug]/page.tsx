import { notFound } from "next/navigation";
import { readBookingSubcategory } from "@/lib/categories-store";
import SubcategoryPageClient from "./SubcategoryPageClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; subSlug: string }> };

export default async function BookingSubcategoryPage({ params }: Props) {
    const { slug, subSlug } = await params;
    const { category, subcategory } = await readBookingSubcategory(slug, subSlug);
    if (!category || !subcategory) notFound();
    return <SubcategoryPageClient category={category} subcategory={subcategory} />;
}
