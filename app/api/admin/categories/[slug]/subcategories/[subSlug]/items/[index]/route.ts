import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { backendAuthHeaders, isAuthorized } from "@/lib/utils/admin-route";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function revalidatePublicBookingPages(slug: string, subSlug: string) {
    revalidatePath("/services");
    revalidatePath("/booking");
    revalidatePath("/booking/[slug]", "page");
    revalidatePath("/booking/[slug]/[subSlug]", "page");
    revalidatePath(`/booking/${slug}`);
    revalidatePath(`/booking/${slug}/${subSlug}`);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string; subSlug: string; index: string }> }) {
    console.log('[DELETE ITEM] Request received');
    if (!isAuthorized(req)) {
        console.log('[DELETE ITEM] Unauthorized');
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { slug, subSlug, index } = await params;
    const itemId = Number(index);
    
    console.log('[DELETE ITEM] Slug:', slug, 'SubSlug:', subSlug, 'ItemId:', itemId);
    
    if (!itemId || isNaN(itemId)) {
        return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }
    
    try {
        console.log('[DELETE ITEM] Deleting service ID:', itemId);
        
        // Delete the service item directly by ID
        const response = await fetch(`${API_URL}/api/services/${itemId}`, {
            method: 'DELETE',
            headers: backendAuthHeaders(req)
        });
        
        console.log('[DELETE ITEM] Backend response status:', response.status);
        
        if (!response.ok) {
            const error = await response.text();
            console.log('[DELETE ITEM] Backend error:', error);
            return NextResponse.json({ error: error || "Failed to delete item" }, { status: response.status });
        }
        
        console.log('[DELETE ITEM] Item deleted successfully');
        revalidatePublicBookingPages(slug, subSlug);
        return NextResponse.json({ success: true, archived: true });
    } catch (error) {
        console.error('[DELETE ITEM] Failed to delete item:', error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
