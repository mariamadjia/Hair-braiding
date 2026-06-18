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

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug } = await params;
    
    try {
        // Get the category by slug from backend
        const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`);
        if (!categoryResponse.ok) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        const category = await categoryResponse.json();
        return NextResponse.json(category);
    } catch (error) {
        console.error('Failed to get category:', error);
        return NextResponse.json({ error: "Failed to get category" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug } = await params;
    const updates = await req.json();
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    
    try {
        // First get the category by slug to find its ID
        const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`);
        if (!categoryResponse.ok) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        const category = await categoryResponse.json();
        
        // Update the category
        const updateResponse = await fetch(`${API_URL}/api/categories/${category.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });
        
        if (!updateResponse.ok) {
            return NextResponse.json({ error: "Failed to update category" }, { status: updateResponse.status });
        }
        
        // Return updated categories list
        const categoriesResponse = await fetch(`${API_URL}/api/categories`);
        const data = await categoriesResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to update category:', error);
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug } = await params;
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    
    try {
        // First get the category by slug to find its ID
        const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`);
        if (!categoryResponse.ok) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        const category = await categoryResponse.json();
        
        // Delete the category
        const deleteResponse = await fetch(`${API_URL}/api/categories/${category.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!deleteResponse.ok) {
            return NextResponse.json({ error: "Failed to delete category" }, { status: deleteResponse.status });
        }
        
        // Return updated categories list
        const categoriesResponse = await fetch(`${API_URL}/api/categories`);
        const data = await categoriesResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to delete category:', error);
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
