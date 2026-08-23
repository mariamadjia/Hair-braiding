import type { LengthOption } from "@/lib/booking-types";

export function formatPrice(price: number | string | undefined): string {
    if (price === undefined || price === null || price === "") {
        return "$0";
    }
    const numPrice = typeof price === "string" ? parseFloat(price.replace(/[^0-9.]/g, "")) : price;
    if (isNaN(numPrice)) {
        return "$0";
    }
    return `$${numPrice.toLocaleString()}`;
}

function numericPrice(price: string | undefined): number {
    if (!price) return Number.POSITIVE_INFINITY;
    const parsed = Number(price.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export function sortLengthOptionsByPrice(options: LengthOption[] | undefined): LengthOption[] {
    return [...(options ?? [])].sort((a, b) => numericPrice(a.price) - numericPrice(b.price));
}
