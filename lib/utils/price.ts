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
