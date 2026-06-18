export type LengthOption = {
    name?: string;
    price?: string;
    duration?: string;
    notes?: string;
};

export type BookingItem = {
    name: string;
    price: string;
    description: string;
    notes?: string;
    image?: string;
    images?: string[];
    link?: string;
    objectPosition?: string;
    availableSizes?: string[];
    lengthOptions?: LengthOption[];
    hairTextures?: string[];
};

export type BookingSubcategory = {
    id?: number;
    name: string;
    slug: string;
    summary?: string;
    image?: string;
    images?: string[];
    items: BookingItem[];
};

export type BookingCategory = {
    id?: number;
    name: string;
    slug: string;
    summary?: string;
    image?: string;
    flippingImages?: string[];
    items?: BookingItem[];
    subcategories?: BookingSubcategory[];
};

export type CategoriesData = {
    defaultBookingUrl: string;
    categories: BookingCategory[];
};
