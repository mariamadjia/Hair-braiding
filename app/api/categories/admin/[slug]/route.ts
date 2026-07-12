import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend-hairbraiding.onrender.com";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { slug } = params;
    
    console.log('[ADMIN CATEGORY DETAIL] Fetching from backend:', `${API_URL}/api/categories/admin/${slug}`);
    
    const res = await fetch(`${API_URL}/api/categories/admin/${slug}`, {
      method: "GET",
      cache: "no-store",
      headers: authHeader ? { "Authorization": authHeader } : {},
      signal: AbortSignal.timeout(15000)
    });

    console.log('[ADMIN CATEGORY DETAIL] Backend response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[ADMIN CATEGORY DETAIL] Backend error:', res.status, errorText);
      return NextResponse.json(
        { error: `Backend failed with status ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log('[ADMIN CATEGORY DETAIL] Successfully loaded category:', data.name);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[ADMIN CATEGORY DETAIL] Failed to load category detail:", error);

    return NextResponse.json(
      { error: "Failed to load category detail" },
      { status: 500 }
    );
  }
}
