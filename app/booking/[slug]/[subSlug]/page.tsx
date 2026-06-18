import { notFound } from "next/navigation";
import { readBookingData } from "@/lib/categories-store";
import SubcategoryPageClient from "./SubcategoryPageClient";

type Props = { params: Promise<{ slug: string; subSlug: string }> };

export default async function BookingSubcategoryPage({ params }: Props) {
    const { slug, subSlug } = await params;
    const categories = await readBookingData();
    const category = categories.find((c) => c.slug === slug);
    if (!category) notFound();
    const subcategory = (category.subcategories ?? []).find((s) => s.slug === subSlug);
    if (!subcategory) notFound();
    return <SubcategoryPageClient category={category} subcategory={subcategory} />;
}
