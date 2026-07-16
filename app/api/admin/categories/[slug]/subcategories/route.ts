import { NextRequest, NextResponse } from "next/server";
import { isAuthorized, revalidatePublicServices } from "@/lib/utils/admin-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';


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
            signal: AbortSignal.timeout(15000)
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
    const authHeader = req.headers.get("authorization") || "";
    
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
                'Authorization': authHeader
            },
            body: JSON.stringify({
                name: subcategory.name,
                categoryId: category.id
            })
        });
        
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error(`[POST SUBCATEGORY] Backend ${createResponse.status} for POST /api/subcategories:`, errorText);
            console.error(`[POST SUBCATEGORY] Auth header sent: ${authHeader.substring(0, 30)}...`);
            return NextResponse.json(
                { error: errorText || "Failed to create subcategory" },
                { status: createResponse.status }
            );
        }
        
        const createdSubcategory = await createResponse.json();
        revalidatePublicServices(slug, createdSubcategory?.slug);

        return NextResponse.json(createdSubcategory, { status: 201 });
    } catch (error) {
        console.error('Failed to create subcategory:', error);
        return NextResponse.json({ error: "Failed to create subcategory" }, { status: 500 });
    }
}
