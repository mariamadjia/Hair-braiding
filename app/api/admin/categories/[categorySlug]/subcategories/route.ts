import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend-hairbraiding.onrender.com";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ categorySlug: string }> }) {
  try {
    const { categorySlug } = await params;
    const authHeader = req.headers.get("authorization");
    
    console.log('[ADMIN SUBCATEGORY SUMMARIES] Fetching from backend:', `${API_URL}/api/categories/admin/${categorySlug}/subcategories`);
    
    const res = await fetch(`${API_URL}/api/categories/admin/${categorySlug}/subcategories`, {
      method: "GET",
      cache: "no-store",
      headers: authHeader ? { "Authorization": authHeader } : {},
      signal: AbortSignal.timeout(10000)
    });

    console.log('[ADMIN SUBCATEGORY SUMMARIES] Backend response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[ADMIN SUBCATEGORY SUMMARIES] Backend error:', res.status, errorText);
      return NextResponse.json(
        { error: `Backend failed with status ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log('[ADMIN SUBCATEGORY SUMMARIES] Successfully loaded summaries:', data.length);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[ADMIN SUBCATEGORY SUMMARIES] Failed to load subcategory summaries:", error);

    return NextResponse.json(
      { error: "Failed to load subcategory summaries" },
      { status: 500 }
    );
  }
}
