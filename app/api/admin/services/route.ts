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

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    try {
        const response = await fetch(`${API_URL}/api/services`);
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to get services:', error);
        return NextResponse.json({ error: "Failed to get services" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const service = await req.json();
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    
    try {
        const response = await fetch(`${API_URL}/api/services`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(service)
        });
        
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to create service" }, { status: response.status });
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to create service:', error);
        return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
    }
}
