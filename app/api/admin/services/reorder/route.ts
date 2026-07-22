import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function PUT(req: NextRequest) {
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    try {
        const response = await fetch(`${API_URL}/api/admin/services/reorder`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: authorization }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
        const payload = await response.json().catch(() => ({ error: "Unable to reorder services" }));
        return NextResponse.json(payload, { status: response.status });
    } catch { return NextResponse.json({ error: "Unable to reorder services" }, { status: 500 }); }
}
