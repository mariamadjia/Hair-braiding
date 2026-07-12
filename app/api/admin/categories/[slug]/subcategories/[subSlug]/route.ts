import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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

function revalidatePublicBookingPages(slug: string, subSlug: string) {
    revalidatePath("/services");
    revalidatePath("/booking");
    revalidatePath(`/booking/${slug}`);
    revalidatePath(`/booking/${slug}/${subSlug}`);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string; subSlug: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug, subSlug } = await params;
    const updates = await req.json();
    const { subcategoryId, ...updateData } = updates;
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    
    try {
        let resolvedSubcategoryId = subcategoryId;

        if (!resolvedSubcategoryId) {
            const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`);
            if (!categoryResponse.ok) return NextResponse.json({ error: "Category not found" }, { status: 404 });
            const category = await categoryResponse.json();
            const subcategoryResponse = await fetch(`${API_URL}/api/subcategories/category/${category.id}`);
            if (!subcategoryResponse.ok) return NextResponse.json({ error: "Failed to fetch subcategories" }, { status: 500 });
            const subcategories = await subcategoryResponse.json();
            const subcategory = subcategories.find((s: any) => s.slug === subSlug);
            if (!subcategory) return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
            resolvedSubcategoryId = subcategory.id;
        }
        
        // Update the subcategory
        const updateResponse = await fetch(`${API_URL}/api/subcategories/${resolvedSubcategoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
            return NextResponse.json({ error: "Failed to update subcategory" }, { status: updateResponse.status });
        }
        
        revalidatePublicBookingPages(slug, subSlug);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update subcategory:', error);
        return NextResponse.json({ error: "Failed to update subcategory" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string; subSlug: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug, subSlug } = await params;
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    let resolvedSubcategoryId: number | null = null;
    try {
        const body = await req.json().catch(() => ({}));
        resolvedSubcategoryId = body?.subcategoryId ?? null;
    } catch {}

    try {
        if (!resolvedSubcategoryId) {
            const categoryResponse = await fetch(`${API_URL}/api/categories/slug/${slug}`);
            if (!categoryResponse.ok) return NextResponse.json({ error: "Category not found" }, { status: 404 });
            const category = await categoryResponse.json();
            const subcategoryResponse = await fetch(`${API_URL}/api/subcategories/category/${category.id}`);
            if (!subcategoryResponse.ok) return NextResponse.json({ error: "Failed to fetch subcategories" }, { status: 500 });
            const subcategories = await subcategoryResponse.json();
            const subcategory = subcategories.find((s: any) => s.slug === subSlug);
            if (!subcategory) return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
            resolvedSubcategoryId = subcategory.id;
        }
        
        // Delete the subcategory
        const deleteResponse = await fetch(`${API_URL}/api/subcategories/${resolvedSubcategoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!deleteResponse.ok) {
            return NextResponse.json({ error: "Failed to delete subcategory" }, { status: deleteResponse.status });
        }
        
        revalidatePublicBookingPages(slug, subSlug);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete subcategory:', error);
        return NextResponse.json({ error: "Failed to delete subcategory" }, { status: 500 });
    }
}
