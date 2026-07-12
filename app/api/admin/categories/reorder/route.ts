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

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const categoryIds = await req.json();
    
    try {
        const response = await fetch(`${API_URL}/api/categories/reorder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(categoryIds)
        });
        
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to reorder categories" }, { status: response.status });
        }
        
        // Return updated categories list
        const categoriesResponse = await fetch(`${API_URL}/api/categories/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await categoriesResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to reorder categories:', error);
        return NextResponse.json({ error: "Failed to reorder categories" }, { status: 500 });
    }
}
