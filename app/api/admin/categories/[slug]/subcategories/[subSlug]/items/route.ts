import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function isAuthorized(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    return authHeader && authHeader.startsWith("Bearer ");
}

function getAuthHeader(req: NextRequest) {
    return req.headers.get("authorization") || "";
}

function revalidatePublicBookingPages(slug: string, subSlug: string) {
    revalidatePath("/services");
    revalidatePath("/booking");
    revalidatePath(`/booking/${slug}`);
    revalidatePath(`/booking/${slug}/${subSlug}`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; subSlug: string }> }) {
    console.log('[POST ITEMS] Request received');
    
    if (!isAuthorized(req)) {
        console.log('[POST ITEMS] Unauthorized - no bearer token');
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { slug, subSlug } = await params;
    const item = await req.json();
    const { subcategoryId, ...itemData } = item;

    console.log('[POST ITEMS] Category slug:', slug, 'Subcategory slug:', subSlug, 'subcategoryId:', subcategoryId);
    
    try {
        let resolvedSubcategoryId = subcategoryId;
        let resolvedCategoryId: number | null = null;

        // Only do the expensive slug lookup if IDs weren't provided
        if (!resolvedSubcategoryId) {
            console.log('[POST ITEMS] subcategoryId missing, fetching category...');
            const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`, {
                headers: { 'Authorization': getAuthHeader(req), 'Content-Type': 'application/json' }
            });
            if (!categoryResponse.ok) return NextResponse.json({ error: "Category not found" }, { status: 404 });
            const category = await categoryResponse.json();
            resolvedCategoryId = category.id;
            const subcategory = category.subcategories?.find((s: any) => s.slug === subSlug);
            if (!subcategory) return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
            resolvedSubcategoryId = subcategory.id;
        }

        const itemWithIds = {
            ...itemData,
            ...(resolvedCategoryId ? { category: { id: resolvedCategoryId } } : {}),
            subcategory: { id: resolvedSubcategoryId }
        };

        console.log('[POST ITEMS] Creating service with subcategoryId:', resolvedSubcategoryId);
        
        const response = await fetch(`${API_URL}/api/services`, {
            method: 'POST',
            headers: {
                'Authorization': getAuthHeader(req),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemWithIds)
        });
        
        console.log('[POST ITEMS] Backend response status:', response.status);
        
        if (!response.ok) {
            const error = await response.text();
            console.log('[POST ITEMS] Backend error:', error);
            return NextResponse.json({ error: error || "Failed to create item" }, { status: response.status });
        }
        
        let createdItem = await response.json().catch(() => null);

        // If backend returns no body or no ID, fetch subcategory services to get the real item ID
        if (!createdItem?.id) {
            const itemsResponse = await fetch(`${API_URL}/api/services/subcategory/${resolvedSubcategoryId}`, {
                headers: { 'Authorization': getAuthHeader(req) }
            });
            if (itemsResponse.ok) {
                const items = await itemsResponse.json();
                createdItem = [...items].reverse().find((service: any) => service.name === itemData.name) ?? null;
            }
        }

        console.log('[POST ITEMS] Service created successfully');
        revalidatePublicBookingPages(slug, subSlug);
        return NextResponse.json(createdItem ?? { success: true }, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create item:', error);
        console.error('Error details:', error.message, error.stack);
        return NextResponse.json({ error: "Failed to create item", details: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string; subSlug: string }> }) {
    console.log('[PUT ITEMS] Request received');
    
    if (!isAuthorized(req)) {
        console.log('[PUT ITEMS] Unauthorized');
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { slug, subSlug } = await params;
    const { itemIndex, item, itemId, subcategoryId } = await req.json();

    console.log('[PUT ITEMS] itemId:', itemId, 'subcategoryId:', subcategoryId, 'itemIndex:', itemIndex);

    try {
        let resolvedItemId = itemId;

        // Only do expensive lookups if itemId wasn't provided
        if (!resolvedItemId) {
            console.log('[PUT ITEMS] itemId missing, falling back to slug lookup...');
            const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`, {
                headers: { 'Authorization': getAuthHeader(req), 'Content-Type': 'application/json' }
            });
            if (!categoryResponse.ok) return NextResponse.json({ error: "Category not found" }, { status: 404 });
            const category = await categoryResponse.json();
            const subcategory = category.subcategories?.find((s: any) => s.slug === subSlug);
            if (!subcategory) return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });

            const itemsResponse = await fetch(`${API_URL}/api/services/subcategory/${subcategory.id}`, {
                headers: { 'Authorization': getAuthHeader(req) }
            });
            if (itemsResponse.ok) {
                const items = await itemsResponse.json();
                resolvedItemId = items[itemIndex]?.id ?? subcategory.items?.[itemIndex]?.id;
            } else {
                resolvedItemId = subcategory.items?.[itemIndex]?.id;
            }
        }

        if (!resolvedItemId) {
            return NextResponse.json({ error: "Item not found or missing ID" }, { status: 404 });
        }

        console.log('[PUT ITEMS] Updating service ID:', resolvedItemId);
        const response = await fetch(`${API_URL}/api/services/${resolvedItemId}`, {
            method: 'PUT',
            headers: {
                'Authorization': getAuthHeader(req),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
        });
        
        console.log('[PUT ITEMS] Backend response status:', response.status);
        
        if (!response.ok) {
            const error = await response.text();
            console.log('[PUT ITEMS] Backend error:', error);
            return NextResponse.json({ error: error || "Failed to update item" }, { status: response.status });
        }
        
        const updatedItem = await response.json().catch(() => ({ ...item, id: resolvedItemId }));
        revalidatePublicBookingPages(slug, subSlug);
        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error('Failed to update item:', error);
        return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string; subSlug: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug, subSlug } = await params;
    const url = new URL(req.url);
    const itemIndex = Number(url.pathname.split('/').pop());
    
    console.log('[DELETE ITEMS] Deleting item at index:', itemIndex, 'for subcategory:', subSlug);
    
    try {
        // Get subcategory ID from slug endpoint
        const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`, {
            headers: {
                'Authorization': getAuthHeader(req),
                'Content-Type': 'application/json'
            }
        });
        
        if (!categoryResponse.ok) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        
        const category = await categoryResponse.json();
        const subcategory = category.subcategories?.find((s: any) => s.slug === subSlug);
        
        if (!subcategory) {
            return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
        }
        
        console.log('[DELETE ITEMS] Subcategory ID:', subcategory.id, 'Items count:', subcategory.items?.length);
        
        // Use services endpoint to get items with IDs
        const itemsResponse = await fetch(`${API_URL}/api/services/subcategory/${subcategory.id}`, {
            headers: { 'Authorization': getAuthHeader(req) }
        });
        
        let itemToDelete: any = null;
        if (itemsResponse.ok) {
            const items = await itemsResponse.json();
            console.log('[DELETE ITEMS] Services endpoint returned items:', items.length);
            itemToDelete = items[itemIndex];
            console.log('[DELETE ITEMS] Item at index', itemIndex, 'from services:', itemToDelete?.id, itemToDelete?.name);
        }
        if (!itemToDelete || !itemToDelete.id) {
            console.log('[DELETE ITEMS] Falling back to subcategory items');
            itemToDelete = subcategory.items?.[itemIndex];
            console.log('[DELETE ITEMS] Item at index', itemIndex, 'from subcategory:', itemToDelete?.id, itemToDelete?.name);
        }
        if (!itemToDelete || !itemToDelete.id) {
            console.error('[DELETE ITEMS] Item not found or missing ID at index:', itemIndex);
            return NextResponse.json({ error: "Item not found or missing ID" }, { status: 404 });
        }
        
        // Delete the service item
        const response = await fetch(`${API_URL}/api/services/${itemToDelete.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': getAuthHeader(req)
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error: error || "Failed to delete item" }, { status: response.status });
        }
        
        revalidatePublicBookingPages(slug, subSlug);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete item:', error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
