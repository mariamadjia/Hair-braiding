import { NextRequest, NextResponse } from "next/server";
import { isAuthorized, revalidatePublicServices } from "@/lib/utils/admin-route";

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug } = await params;
    const authHeader = req.headers.get("authorization");
    
    try {
        // Get the category by slug from backend using new optimized endpoint
        const categoryResponse = await fetch(`${API_URL}/api/categories/admin/${slug}`, {
            method: "GET",
            cache: "no-store",
            headers: authHeader ? { "Authorization": authHeader } : {},
            signal: AbortSignal.timeout(15000)
        });
        
        if (!categoryResponse.ok) {
            const errorText = await categoryResponse.text();
            console.error('[ADMIN CATEGORY DETAIL] Backend error:', categoryResponse.status, errorText);
            return NextResponse.json({ error: "Category not found" }, { status: categoryResponse.status });
        }
        
        const category = await categoryResponse.json();
        console.log('[ADMIN CATEGORY DETAIL] Successfully loaded category:', slug);
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
    const authHeader = req.headers.get("authorization");
    
    try {
        const updateResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { 'Authorization': authHeader } : {})
            },
            body: JSON.stringify(updates)
        });
        
        if (!updateResponse.ok) {
            return NextResponse.json({ error: "Failed to update category" }, { status: updateResponse.status });
        }
        
        const updated = await updateResponse.json().catch(() => ({ success: true }));
        revalidatePublicServices(slug);
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update category:', error);
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug } = await params;
    const authHeader = req.headers.get("authorization");
    
    try {
        const deleteResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`, {
            method: 'DELETE',
            headers: {
                ...(authHeader ? { 'Authorization': authHeader } : {})
            }
        });
        
        if (!deleteResponse.ok) {
            return NextResponse.json({ error: "Failed to delete category" }, { status: deleteResponse.status });
        }
        
        revalidatePublicServices(slug);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete category:', error);
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
