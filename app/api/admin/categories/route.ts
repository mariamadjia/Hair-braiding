import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/booking`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend failed with status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    const normalizedData = Array.isArray(data)
      ? { categories: data }
      : data;

    return NextResponse.json(normalizedData, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to load admin categories:", error);

    return NextResponse.json(
      { error: "Failed to load admin categories" },
      { status: 500 }
    );
  }
}
