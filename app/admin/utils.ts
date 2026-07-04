import type { BookingItem, LengthOption } from "@/lib/booking-types";
import { galleryApi } from "@/lib/api/gallery";
import { getAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";
import { toProxyUrl } from "@/lib/utils/image";

export function slugify(s: string) {
    return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function emptyItem(): BookingItem {
    return { name: "", price: "", description: "", lengthOptions: [] };
}

export function emptyLengthOption(): LengthOption {
    return { name: "", price: "$", notes: "$50.00 deposit required" };
}

export async function uploadFile(file: File, token: string): Promise<string> {
    try {
        const result = await galleryApi.uploadImage({
            file,
            title: file.name,
        });
        // Convert backend URL to proxy URL for proper authentication
        return toProxyUrl(result.imageUrl);
    } catch (error) {
        console.error('Upload failed:', error);
        throw new Error(error instanceof Error ? error.message : "Upload failed");
    }
}
