import type { BookingItem, LengthOption } from "@/lib/booking-types";

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
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`
        },
        body: formData,
    });
    const json = await res.json();
    if (!json.url) throw new Error(json.error ?? "Upload failed");
    return json.url;
}
