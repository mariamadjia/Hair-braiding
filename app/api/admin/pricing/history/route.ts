import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/utils/admin-route";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const response = await fetch(`${API_URL}/api/admin/pricing/history?limit=100`, {
      headers: { Authorization: req.headers.get("authorization") || "" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => []);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Unable to load pricing history" }, { status: 503 });
  }
}
