import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend-hairbraiding.onrender.com";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const authHeader = req.headers.get("authorization");
    
    console.log('[ADMIN SUBCATEGORY DETAIL] Fetching from backend:', `${API_URL}/api/subcategories/admin/${slug}`);
    
    const res = await fetch(`${API_URL}/api/subcategories/admin/${slug}`, {
      method: "GET",
      cache: "no-store",
      headers: authHeader ? { "Authorization": authHeader } : {},
      signal: AbortSignal.timeout(15000)
    });

    console.log('[ADMIN SUBCATEGORY DETAIL] Backend response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[ADMIN SUBCATEGORY DETAIL] Backend error:', res.status, errorText);
      return NextResponse.json(
        { error: `Backend failed with status ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log('[ADMIN SUBCATEGORY DETAIL] Successfully loaded subcategory:', slug);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[ADMIN SUBCATEGORY DETAIL] Failed to load subcategory detail:", error);

    return NextResponse.json(
      { error: "Failed to load subcategory detail" },
      { status: 500 }
    );
  }
}
