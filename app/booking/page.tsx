import { readCategories } from "@/lib/categories-store";
import BookingPageClient from "./BookingPageClient";

export default async function BookingPage() {
    const { categories } = await readCategories();

    return <BookingPageClient categories={categories} />;
}
