import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });
    try {
        const response = await fetch(`${API_URL}/api/admin/services/${id}/restore`, { method: "POST", headers: { Authorization: authorization }, signal: AbortSignal.timeout(10000) });
        const payload = await response.json().catch(() => ({ error: "Unable to restore service" }));
        return NextResponse.json(payload, { status: response.status });
    } catch { return NextResponse.json({ error: "Unable to restore service" }, { status: 500 }); }
}
