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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id } = await params;
    
    try {
        const response = await fetch(`${API_URL}/api/services/${id}`);
        if (!response.ok) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }
        const data = await response.json();
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
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to update service" }, { status: response.status });
        }
        
        const data = await response.json();
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
            }
        });
        
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to delete service" }, { status: response.status });
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to delete service:', error);
        return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
    }
}
