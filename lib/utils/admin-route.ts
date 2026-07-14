import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

export function isAuthorized(req: NextRequest): boolean {
    if (req.headers.get("x-admin-token") === process.env.ADMIN_SECRET) {
        return true;
    }
    const auth = req.headers.get("authorization");
    return !!auth?.startsWith("Bearer ");
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
