import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, isAuthorized, revalidatePublicServices } from "@/lib/utils/admin-route";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function forward(req: NextRequest, method: "GET" | "PUT") {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const response = await fetch(`${API_URL}/api/admin/pricing/deposits`, {
      method,
      headers: {
        ...backendAuthHeaders(req),
        ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "PUT" ? JSON.stringify(await req.json()) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => ({ error: "Invalid backend response" }));
    if (!response.ok) return NextResponse.json(payload, { status: response.status });
    if (method === "PUT") revalidatePublicServices();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Unable to reach pricing service" }, { status: 503 });
  }
}

export async function GET(req: NextRequest) { return forward(req, "GET"); }
export async function PUT(req: NextRequest) { return forward(req, "PUT"); }
