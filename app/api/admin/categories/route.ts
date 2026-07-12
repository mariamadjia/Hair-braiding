import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend-hairbraiding.onrender.com";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    
    console.log('[ADMIN CATEGORIES] Fetching from backend:', `${API_URL}/api/categories/admin`);
    
    const res = await fetch(`${API_URL}/api/categories/admin`, {
      method: "GET",
      cache: "no-store",
      headers: authHeader ? { "Authorization": authHeader } : {},
      signal: AbortSignal.timeout(30000)
    });

    console.log('[ADMIN CATEGORIES] Backend response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[ADMIN CATEGORIES] Backend error:', res.status, errorText);
      return NextResponse.json(
        { error: `Backend failed with status ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log('[ADMIN CATEGORIES] Successfully loaded categories:', data.categories?.length);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[ADMIN CATEGORIES] Failed to load admin categories:", error);

    return NextResponse.json(
      { error: "Failed to load admin categories" },
      { status: 500 }
    );
  }
}
