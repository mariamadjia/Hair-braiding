import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

function isAuthorized(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    return authHeader && authHeader.startsWith("Bearer ");
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    revalidateTag("categories");
    revalidatePath("/services");
    revalidatePath("/booking");
    revalidatePath("/booking/[slug]", "page");
    revalidatePath("/booking/[slug]/[subSlug]", "page");

    return NextResponse.json({ revalidated: true });
}
