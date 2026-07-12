import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function isAuthorized(req: NextRequest) {
    // Check for x-admin-token (legacy)
    const adminToken = req.headers.get("x-admin-token");
    if (adminToken === process.env.ADMIN_SECRET) {
        return true;
    }
    
    // Check for Bearer token (JWT)
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return true;
    }
    
    return false;
}

// GET: Fetch subcategory summaries for a category
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug } = await params;
    const authHeader = req.headers.get("authorization");
    
    console.log('[ADMIN SUBCATEGORY SUMMARIES] Fetching from backend:', `${API_URL}/api/categories/admin/${slug}/subcategories`);
    
    try {
        const res = await fetch(`${API_URL}/api/categories/admin/${slug}/subcategories`, {
            method: "GET",
            cache: "no-store",
            headers: authHeader ? { "Authorization": authHeader } : {},
            signal: AbortSignal.timeout(10000)
        });

        console.log('[ADMIN SUBCATEGORY SUMMARIES] Backend response status:', res.status);

        if (!res.ok) {
            const errorText = await res.text();
            console.error('[ADMIN SUBCATEGORY SUMMARIES] Backend error:', res.status, errorText);
            return NextResponse.json(
                { error: `Backend failed with status ${res.status}: ${errorText}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        console.log('[ADMIN SUBCATEGORY SUMMARIES] Successfully loaded summaries:', data.length);

        return NextResponse.json(data, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        });
    } catch (error) {
        console.error("[ADMIN SUBCATEGORY SUMMARIES] Failed to load subcategory summaries:", error);

        return NextResponse.json(
            { error: "Failed to load subcategory summaries" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug } = await params;
    const subcategory = await req.json();
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    
    try {
        // First get the category by slug to find its ID
        const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`);
        if (!categoryResponse.ok) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        const category = await categoryResponse.json();
        
        // Create the subcategory using the correct backend endpoint
        const createResponse = await fetch(`${API_URL}/api/subcategories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: subcategory.name,
                categoryId: category.id
            })
        });
        
        if (!createResponse.ok) {
            return NextResponse.json({ error: "Failed to create subcategory" }, { status: createResponse.status });
        }
        
        // Return updated categories list
        const categoriesResponse = await fetch(`${API_URL}/api/categories/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await categoriesResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to create subcategory:', error);
        return NextResponse.json({ error: "Failed to create subcategory" }, { status: 500 });
    }
}
