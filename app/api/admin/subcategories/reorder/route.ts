import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, isAuthorized, revalidatePublicServices } from "@/lib/utils/admin-route";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subcategoryIds = await req.json();
    try {
        const response = await fetch(`${API_URL}/api/subcategories/reorder`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...backendAuthHeaders(req),
            },
            body: JSON.stringify(subcategoryIds),
            signal: AbortSignal.timeout(10000),
        });
        const payload = await response.json().catch(() => ({ error: "Unable to reorder styles" }));
        if (response.ok) revalidatePublicServices();
        return NextResponse.json(payload, { status: response.status });
    } catch {
        return NextResponse.json({ error: "Unable to reorder styles" }, { status: 500 });
    }
}
