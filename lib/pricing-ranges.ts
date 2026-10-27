import type { BookingItem, BookingSubcategory } from "@/lib/booking-types";
import { formatPrice } from "@/lib/utils/price";

function configuredPrice(value: string | undefined): number | null {
    if (!value?.trim()) return null;
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
}

export function itemPrices(item: BookingItem): number[] {
    const prices: number[] = [];
    const basePrice = configuredPrice(item.price);
    if ((item.pricingMode === "FIXED" || !item.lengthOptions?.length) && basePrice !== null) prices.push(basePrice);

    const adjustment = configuredPrice(item.knotlessPriceAdjustment) ?? 0;
    for (const option of item.lengthOptions ?? []) {
        const regularPrice = configuredPrice(option.price);
        const knotlessPrice = configuredPrice(option.knotlessPrice);
        if (regularPrice !== null) prices.push(regularPrice);
        if (item.foundationChoicesEnabled && item.knotlessPricingMode === "SEPARATE" && knotlessPrice !== null) {
            prices.push(knotlessPrice);
        } else if (item.foundationChoicesEnabled && regularPrice !== null && adjustment > 0) {
            prices.push(regularPrice + adjustment);
        }
    }

    if (item.foundationChoicesEnabled && item.pricingMode === "FIXED" && basePrice !== null && adjustment > 0) {
        prices.push(basePrice + adjustment);
    }
    return prices;
}

export function priceRangeLabel(prices: number[]): string | null {
    if (prices.length === 0) return null;
    const minimum = Math.min(...prices);
    const maximum = Math.max(...prices);
    return minimum === maximum ? formatPrice(minimum) : `${formatPrice(minimum)} – ${formatPrice(maximum)}`;
}

export function itemPriceRangeLabel(item: BookingItem): string | null {
    return priceRangeLabel(itemPrices(item));
}

export function subcategoryPriceRangeLabel(subcategory: BookingSubcategory): string | null {
    return priceRangeLabel((subcategory.items ?? []).flatMap(itemPrices));
}
