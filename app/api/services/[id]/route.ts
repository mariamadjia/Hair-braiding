import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
