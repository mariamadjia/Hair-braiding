import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function isAuthorized(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    return authHeader && authHeader.startsWith("Bearer ");
}

function getAuthHeader(req: NextRequest) {
    return req.headers.get("authorization") || "";
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string; subSlug: string; index: string }> }) {
    console.log('[DELETE ITEM] Request received');
    
    if (!isAuthorized(req)) {
        console.log('[DELETE ITEM] Unauthorized');
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { slug, subSlug, index } = await params;
    const itemIndex = Number(index);
    
    console.log('[DELETE ITEM] Slug:', slug, 'SubSlug:', subSlug, 'Index:', itemIndex);
    
    try {
        // First get the category to find IDs
        const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`, {
            headers: {
                'Authorization': getAuthHeader(req),
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[DELETE ITEM] Category response status:', categoryResponse.status);
        
        if (!categoryResponse.ok) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        
        const category = await categoryResponse.json();
        const subcategory = category.subcategories?.find((s: any) => s.slug === subSlug);
        
        if (!subcategory) {
            console.log('[DELETE ITEM] Subcategory not found');
            return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
        }
        
        const itemToDelete = subcategory.items[itemIndex];
        if (!itemToDelete) {
            console.log('[DELETE ITEM] Item not found at index:', itemIndex);
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }
        
        console.log('[DELETE ITEM] Deleting service ID:', itemToDelete.id);
        
        // Delete the service item
        const response = await fetch(`${API_URL}/api/services/${itemToDelete.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': getAuthHeader(req)
            }
        });
        
        console.log('[DELETE ITEM] Backend response status:', response.status);
        
        if (!response.ok) {
            const error = await response.text();
            console.log('[DELETE ITEM] Backend error:', error);
            return NextResponse.json({ error: error || "Failed to delete item" }, { status: response.status });
        }
        
        console.log('[DELETE ITEM] Item deleted successfully');
        
        // Fetch updated categories to return
        const categoriesResponse = await fetch(`${API_URL}/api/categories`, {
            headers: {
                'Authorization': getAuthHeader(req),
                'Content-Type': 'application/json'
            }
        });
        
        const categoriesData = await categoriesResponse.json();
        console.log('[DELETE ITEM] Returning updated categories');
        return NextResponse.json(categoriesData);
    } catch (error) {
        console.error('[DELETE ITEM] Failed to delete item:', error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
