import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, isAuthorized, revalidatePublicServices } from "@/lib/utils/admin-route";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function forward(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { path } = await context.params;
  try {
    const response = await fetch(`${API_URL}/api/admin/pricing/${path.join("/")}`, {
      method: req.method,
      headers: {
        ...backendAuthHeaders(req),
        ...(req.method !== "GET" ? { "Content-Type": "application/json" } : {}),
      },
      body: req.method === "GET" ? undefined : await req.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json().catch(() => ({ error: "Invalid backend response" }));
    if (response.ok && req.method !== "GET") revalidatePublicServices();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Unable to reach pricing service" }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
