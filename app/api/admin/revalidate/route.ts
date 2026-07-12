import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

function isAuthorized(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    return authHeader && authHeader.startsWith("Bearer ");
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ revalidated: true });
}
