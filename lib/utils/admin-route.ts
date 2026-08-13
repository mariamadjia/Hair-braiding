import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

export function isAuthorized(req: NextRequest): boolean {
    if (req.headers.get("x-admin-token") === process.env.ADMIN_SECRET) {
        return true;
    }
    if (req.headers.get("cookie")) return true;
    const auth = req.headers.get("authorization");
    return !!auth?.startsWith("Bearer ") && auth !== "Bearer cookie-session";
}

export function backendAuthHeaders(req: NextRequest): Record<string, string> {
    const headers: Record<string, string> = {};
    const cookie = req.headers.get("cookie");
    const authorization = req.headers.get("authorization");
    if (cookie) headers.Cookie = cookie;
    if (authorization?.startsWith("Bearer ") && authorization !== "Bearer cookie-session") {
        headers.Authorization = authorization;
    }
    return headers;
}

export function revalidatePublicServices(catSlug?: string, subSlug?: string) {
    revalidatePath("/services");
    revalidatePath("/booking");
    revalidatePath("/booking/[slug]", "page");
    revalidatePath("/booking/[slug]/[subSlug]", "page");
    if (catSlug) {
        revalidatePath(`/booking/${catSlug}`);
        if (subSlug) {
            revalidatePath(`/booking/${catSlug}/${subSlug}`);
        }
    }
}
