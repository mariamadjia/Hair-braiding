import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function isAuthorized(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    return authHeader && authHeader.startsWith("Bearer ");
}

function getAuthHeader(req: NextRequest) {
    return req.headers.get("authorization") || "";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; subSlug: string }> }) {
    console.log('[POST ITEMS] Request received');
    
    if (!isAuthorized(req)) {
        console.log('[POST ITEMS] Unauthorized - no bearer token');
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { slug, subSlug } = await params;
    const item = await req.json();
    
    console.log('[POST ITEMS] Item data:', JSON.stringify(item, null, 2));
    console.log('[POST ITEMS] Category slug:', slug, 'Subcategory slug:', subSlug);
    
    try {
        // First get the category to find its ID
        console.log('[POST ITEMS] Fetching category...');
        const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`, {
            headers: {
                'Authorization': getAuthHeader(req),
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[POST ITEMS] Category response status:', categoryResponse.status);
        
        if (!categoryResponse.ok) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        
        const category = await categoryResponse.json();
        const subcategory = category.subcategories?.find((s: any) => s.slug === subSlug);
        
        if (!subcategory) {
            return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
        }
        
        // Create the service item with category and subcategory IDs
        const itemWithIds = {
            ...item,
            category: { id: category.id },
            subcategory: { id: subcategory.id }
        };
        
        console.log('[POST ITEMS] Creating service with data:', JSON.stringify(itemWithIds, null, 2));
        
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
        
        console.log('[POST ITEMS] Service created successfully');
        
        // Fetch updated categories to return
        console.log('[POST ITEMS] Fetching updated categories...');
        const categoriesResponse = await fetch(`${API_URL}/api/categories/admin`, {
            headers: {
                'Authorization': getAuthHeader(req),
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[POST ITEMS] Categories response status:', categoriesResponse.status);
        const categoriesData = await categoriesResponse.json();
        console.log('[POST ITEMS] Returning categories data with', categoriesData.categories?.length, 'categories');
        return NextResponse.json(categoriesData);
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
    const { itemIndex, item } = await req.json();
    
    console.log('[PUT ITEMS] Item index:', itemIndex, 'Item data:', JSON.stringify(item, null, 2));
    
    try {
        // Use category slug endpoint to get IDs - it returns full entity with IDs
        const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`, {
            headers: {
                'Authorization': getAuthHeader(req),
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[PUT ITEMS] Category fetch status:', categoryResponse.status);
        
        if (!categoryResponse.ok) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        
        const category = await categoryResponse.json();
        console.log('[PUT ITEMS] Category ID:', category.id, 'Subcategories:', category.subcategories?.length);
        
        const subcategory = category.subcategories?.find((s: any) => s.slug === subSlug);
        
        if (!subcategory) {
            return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
        }
        
        console.log('[PUT ITEMS] Subcategory ID:', subcategory.id, 'Items:', subcategory.items?.length);
        
        // Get items by subcategory ID to ensure we have item IDs
        const itemsResponse = await fetch(`${API_URL}/api/services/subcategory/${subcategory.id}`, {
            headers: { 'Authorization': getAuthHeader(req) }
        });
        
        let itemToUpdate: any = null;
        if (itemsResponse.ok) {
            const items = await itemsResponse.json();
            itemToUpdate = items[itemIndex];
            console.log('[PUT ITEMS] Found item via services endpoint:', itemToUpdate?.id);
        }
        
        // Fallback: use item from subcategory directly
        if (!itemToUpdate || !itemToUpdate.id) {
            itemToUpdate = subcategory.items?.[itemIndex];
            console.log('[PUT ITEMS] Fallback item:', itemToUpdate?.id);
        }
        
        if (!itemToUpdate || !itemToUpdate.id) {
            return NextResponse.json({ error: "Item not found or missing ID" }, { status: 404 });
        }
        
        // Update the service item
        console.log('[PUT ITEMS] Updating service ID:', itemToUpdate.id);
        const response = await fetch(`${API_URL}/api/services/${itemToUpdate.id}`, {
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
        
        // Fetch updated categories to return
        const categoriesResponse = await fetch(`${API_URL}/api/categories/admin`, {
            headers: {
                'Authorization': getAuthHeader(req),
                'Content-Type': 'application/json'
            }
        });
        
        const categoriesData = await categoriesResponse.json();
        return NextResponse.json(categoriesData);
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
    
    try {
        // First get the category to find IDs
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
        
        const itemToDelete = subcategory.items[itemIndex];
        if (!itemToDelete) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
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
        
        // Fetch updated categories to return
        const categoriesResponse = await fetch(`${API_URL}/api/categories/admin`, {
            headers: {
                'Authorization': getAuthHeader(req),
                'Content-Type': 'application/json'
            }
        });
        
        const categoriesData = await categoriesResponse.json();
        return NextResponse.json(categoriesData);
    } catch (error) {
        console.error('Failed to delete item:', error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
