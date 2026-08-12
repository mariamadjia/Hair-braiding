import { NextRequest, NextResponse } from "next/server";

// Same-origin route handlers proxy selected operations to Spring. Forward the secure
// session cookie as an Authorization header internally; it never becomes readable
// by browser JavaScript.
export function proxy(request: NextRequest) {
  const session = request.cookies.get("ah_admin_session")?.value;
  if (!session) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${session}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
};
