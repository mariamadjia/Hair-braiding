export type CategorySummary = {
    id?: number;
    name: string;
    slug: string;
    displayOrder?: number;
};

export type SubcategorySummary = {
    id?: number;
    name: string;
    slug: string;
    displayOrder?: number;
};

export type LengthOption = {
    name?: string;
    price?: string;
    duration?: string;
    notes?: string;
};

export type BookingItem = {
    id?: number;
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

export type GalleryImageItem = {
    id: number;
    imageUrl: string;
    thumbnailUrl?: string;
    title?: string;
    altText?: string;
    displayOrder?: number;
    subcategoryId?: number;
    subcategoryName?: string;
};

export type BookingSubcategory = {
    id?: number;
    name: string;
    slug: string;
    summary?: string;
    image?: string;
    images?: string[];
    items: BookingItem[];
    displayOrder?: number;
    galleryImages?: GalleryImageItem[];
};

export type BookingCategory = {
    id?: number;
    name: string;
    slug: string;
    summary?: string;
    image?: string;
    flippingImages?: string[];
    displayOrder?: number;
    items?: BookingItem[];
    subcategories?: BookingSubcategory[];
};

export type CategoriesData = {
    defaultBookingUrl: string;
    categories: BookingCategory[];
};
