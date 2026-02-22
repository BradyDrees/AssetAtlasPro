import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware: auth session refresh + role-based routing (UX redirect hint ONLY).
 *
 * IMPORTANT: The role cookie is a UX convenience for routing.
 * It is NOT a security boundary. Server-side enforcement happens in
 * requireVendorRole() / requirePmRole() via membership table checks.
 */
export async function middleware(request: NextRequest) {
  // 1. Refresh auth session + set role cookie
  const response = await updateSession(request);

  // 2. Role-based routing (UX redirect hint only)
  const { pathname } = request.nextUrl;

  // Skip role routing for public, auth, API, and static paths
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/" ||
    pathname === "/favicon.ico"
  ) {
    return response;
  }

  // Read role from cookie (set by updateSession)
  const roleCookie = request.cookies.get("active_role")?.value;

  // Redirect vendor users away from /dashboard to /vendor
  if (roleCookie === "vendor" && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/vendor";
    return NextResponse.redirect(url);
  }

  // Redirect PM users away from /vendor to /dashboard
  if (roleCookie !== "vendor" && pathname.startsWith("/vendor")) {
    // Exception: allow /vendor/onboarding and /vendor/accept-invite for any authenticated user
    if (
      pathname === "/vendor/onboarding" ||
      pathname.startsWith("/vendor/accept-invite")
    ) {
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
