import type { CategoriesData, BookingCategory } from "./booking-types";
import { API_BASE_URL } from "./config/api";

const API_URL = API_BASE_URL;

export async function readCategories(): Promise<CategoriesData> {
    try {
        const response = await fetch(`${API_URL}/api/categories`, {
            cache: 'no-store' // Always get fresh data
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch categories: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Backend returns the full CategoriesData object
        if (data.categories && Array.isArray(data.categories)) {
            return {
                defaultBookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL || data.defaultBookingUrl || "",
                categories: data.categories
            };
        }
        
        // Fallback if data is just an array
        return {
            defaultBookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL || "",
            categories: Array.isArray(data) ? data : []
        };
    } catch (error) {
        console.error('Error fetching categories:', error);
        // Return empty data on error
        return {
            defaultBookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL || "",
            categories: []
        };
    }
}

export async function readBookingData(): Promise<BookingCategory[]> {
    try {
        const response = await fetch(`${API_URL}/api/booking`, {
            cache: 'no-store' // Always get fresh data
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch booking data: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching booking data:', error);
        // Return empty array on error
        return [];
    }
}

export async function writeCategories(data: CategoriesData): Promise<void> {
    // This function is no longer needed since we're using the backend API
    // The admin panel updates the database directly
    console.warn('writeCategories is deprecated - use the admin API instead');
}
