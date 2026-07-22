import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-hairbraiding.onrender.com';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const categoryId = searchParams.get('categoryId');
        const subcategoryId = searchParams.get('subcategoryId');
        
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
