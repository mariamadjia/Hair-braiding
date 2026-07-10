import { notFound } from "next/navigation";
import { readBookingCategory } from "@/lib/categories-store";
import CategoryPageClient from "./CategoryPageClient";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export default async function BookingCategoryPage({ params }: Props) {
    const { slug } = await params;

    const category = await readBookingCategory(slug);

    if (!category) {
        notFound();
    }

    return <CategoryPageClient category={category} />;
}
