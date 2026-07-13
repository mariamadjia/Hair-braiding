import { notFound } from "next/navigation";
import { readBookingCategory } from "@/lib/categories-store";
import CategoryPageClient from "./CategoryPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
