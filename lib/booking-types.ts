export type CategorySummary = {
    id?: number;
    name: string;
    slug: string;
    displayOrder?: number;
    styleCount?: number;
    bookingCount?: number;
    updatedAt?: string;
};

export type SubcategorySummary = {
    id?: number;
    name: string;
    slug: string;
    displayOrder?: number;
};

export type LengthOption = {
    id?: number;
    displayOrder?: number;
    name?: string;
    price?: string;
    knotlessPrice?: string;
    notes?: string;
    imageUrl?: string;
};

export type BookingItem = {
    id?: number;
    version?: number;
    name: string;
    price: string;
    description: string;
    notes?: string;
    image?: string;
    images?: string[];
    sizePhotos?: string[];
    link?: string;
    objectPosition?: string;
    availableSizes?: string[];
    lengthOptions?: LengthOption[];
    hairTextures?: string[];
    displayOrder?: number;
    foundationChoicesEnabled?: boolean;
    knotlessPriceAdjustment?: string;
    knotlessPricingMode?: "ADJUSTMENT" | "SEPARATE";
    depositOverrideCents?: number | null;
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
    serviceTagline?: string;
    serviceDescription?: string;
    image?: string;
    flippingImages?: string[];
    displayOrder?: number;
    directServiceCount?: number;
    items?: BookingItem[];
    subcategories?: BookingSubcategory[];
};

export type CategoriesData = {
    defaultBookingUrl: string;
    categories: BookingCategory[];
};

export type BookingAddOn = {
    id: number;
    assignmentId: number;
    name: string;
    description?: string | null;
    pricingMode: "FIXED" | "STARTING_AT";
    priceCents: number;
    depositBehavior: "NO_CHANGE" | "ADD_FIXED";
    depositAdjustmentCents: number;
    active: boolean;
    displayOrder: number;
    subcategoryId: number;
    subcategoryName?: string;
    allSizes: boolean;
    allLengths: boolean;
    serviceItemIds: number[];
    lengthOptionIds: number[];
    confirmationRequired: boolean;
};
