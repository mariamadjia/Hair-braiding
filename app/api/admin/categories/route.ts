import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, isAuthorized, revalidatePublicServices } from "@/lib/utils/admin-route";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  try {
    console.log('[ADMIN CATEGORIES] Fetching from backend:', `${API_URL}/api/categories/admin`);
    
    const res = await fetch(`${API_URL}/api/categories/admin`, {
      method: "GET",
      cache: "no-store",
      headers: backendAuthHeaders(req),
      signal: AbortSignal.timeout(15000)
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

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${API_URL}/api/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...backendAuthHeaders(req),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: errorText || "Failed to create category" },
        { status: res.status }
      );
    }

    const createdCategory = await res.json();
    revalidatePublicServices();

    return NextResponse.json(createdCategory, {
      status: 201,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("[ADMIN CATEGORIES] Failed to create category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
