import { notFound } from "next/navigation";
import { readBookingCategory, readCategories } from "@/lib/categories-store";
import CategoryPageClient from "./CategoryPageClient";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
    try {
        const { categories } = await readCategories();
        return categories.map((cat) => ({ slug: cat.slug }));
    } catch {
        return [];
    }
}

type Props = { params: Promise<{ slug: string }> };

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
