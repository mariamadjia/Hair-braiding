import { NextRequest, NextResponse } from "next/server";
import { revalidatePublicServices } from "@/lib/utils/admin-route";

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function isAuthorized(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    return Boolean(authHeader?.startsWith("Bearer ") && authHeader.length > 7);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id } = await params;
    
    try {
        const response = await fetch(`${API_URL}/api/services/${id}`, {
            headers: { Authorization: req.headers.get("authorization") || "" },
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
            return NextResponse.json(await response.json().catch(() => ({ error: "Unable to load service" })), { status: response.status });
        }
        const data = await response.json();
        revalidatePublicServices();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to get service:', error);
        return NextResponse.json({ error: "Failed to get service" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id } = await params;
    const updates = await req.json();
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    
    try {
        const response = await fetch(`${API_URL}/api/services/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates),
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            return NextResponse.json(await response.json().catch(() => ({ error: "Failed to update service" })), { status: response.status });
        }
        
        const data = await response.json();
        revalidatePublicServices();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to update service:', error);
        return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id } = await params;
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    
    try {
        const response = await fetch(`${API_URL}/api/services/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            return NextResponse.json(await response.json().catch(() => ({ error: "Failed to archive service" })), { status: response.status });
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to delete service:', error);
        return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
    }
}
