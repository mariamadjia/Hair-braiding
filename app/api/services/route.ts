import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const categoryId = searchParams.get('categoryId');
        const subcategoryId = searchParams.get('subcategoryId');
        if ((categoryId && !/^\d+$/.test(categoryId)) || (subcategoryId && !/^\d+$/.test(subcategoryId))) {
            return NextResponse.json({ error: "Invalid service filter" }, { status: 400 });
        }
        
        let url = `${API_URL}/api/services`;
        
        if (categoryId) {
            url = `${API_URL}/api/services/category/${categoryId}`;
        } else if (subcategoryId) {
            url = `${API_URL}/api/services/subcategory/${subcategoryId}`;
        }
        
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to get services" }, { status: response.status });
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to get services:', error);
        return NextResponse.json({ error: "Failed to get services" }, { status: 500 });
    }
}
