import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });
    
    try {
        const response = await fetch(`${API_URL}/api/services/${id}`, {
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) return NextResponse.json(await response.json().catch(() => ({ error: "Unable to load service" })), { status: response.status });
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to get service:', error);
        return NextResponse.json({ error: "Failed to get service" }, { status: 500 });
    }
}
