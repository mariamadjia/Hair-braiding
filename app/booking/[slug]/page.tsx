import { notFound } from "next/navigation";
import { readBookingData } from "@/lib/categories-store";
import CategoryPageClient from "./CategoryPageClient";

type Props = { params: Promise<{ slug: string }> };

export default async function BookingCategoryPage({ params }: Props) {
    const { slug } = await params;
    const categories = await readBookingData();
    const category = categories.find((c) => c.slug === slug);
    if (!category) notFound();
    return <CategoryPageClient category={category} />;
}
