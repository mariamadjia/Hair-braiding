import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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
        const categoriesResponse = await fetch(`${API_URL}/api/categories`);
        const data = await categoriesResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to create subcategory:', error);
        return NextResponse.json({ error: "Failed to create subcategory" }, { status: 500 });
    }
}
