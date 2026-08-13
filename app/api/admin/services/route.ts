import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, isAuthorized, revalidatePublicServices } from "@/lib/utils/admin-route";

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    try {
        const requestUrl = new URL(req.url);
        const archived = requestUrl.searchParams.get("archived") === "true";
        const subcategoryId = requestUrl.searchParams.get("subcategoryId");
        const backendUrl = archived
            ? `${API_URL}/api/admin/services/archived${subcategoryId ? `?subcategoryId=${encodeURIComponent(subcategoryId)}` : ""}`
            : `${API_URL}/api/services`;
        const response = await fetch(backendUrl, {
            headers: backendAuthHeaders(req),
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
            return NextResponse.json(await response.json().catch(() => ({ error: "Failed to get services" })), { status: response.status });
        }
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
    try {
        const response = await fetch(`${API_URL}/api/services`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...backendAuthHeaders(req)
            },
            body: JSON.stringify(service),
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            return NextResponse.json(await response.json().catch(() => ({ error: "Failed to create service" })), { status: response.status });
        }
        
        const data = await response.json();
        revalidatePublicServices();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to create service:', error);
        return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
    }
}
