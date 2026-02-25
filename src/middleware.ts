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

  // ============================================
  // Legacy URL redirects (backward compatibility)
  // ============================================

  // Old /dashboard → /acquire/dashboard
  if (pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/acquire/dashboard";
    return NextResponse.redirect(url, 308);
  }

  // Old /projects/* → /acquire/projects/*
  if (pathname.startsWith("/projects")) {
    const url = request.nextUrl.clone();
    url.pathname = "/acquire" + pathname;
    return NextResponse.redirect(url, 308);
  }

  // Old /deal-analysis/* → /acquire/deal-analysis/*
  if (pathname.startsWith("/deal-analysis")) {
    const url = request.nextUrl.clone();
    url.pathname = "/acquire" + pathname;
    return NextResponse.redirect(url, 308);
  }

  // Old /inspections/* → /operate/inspections/*
  if (pathname.startsWith("/inspections")) {
    const url = request.nextUrl.clone();
    url.pathname = "/operate" + pathname;
    return NextResponse.redirect(url, 308);
  }

  // Old /unit-turns/* → /operate/unit-turns/*
  if (pathname.startsWith("/unit-turns")) {
    const url = request.nextUrl.clone();
    url.pathname = "/operate" + pathname;
    return NextResponse.redirect(url, 308);
  }

  // Old /vendors/* → /operate/vendors/*
  if (pathname.startsWith("/vendors")) {
    const url = request.nextUrl.clone();
    url.pathname = "/operate" + pathname;
    return NextResponse.redirect(url, 308);
  }

  // Old /work-orders/* → /operate/work-orders/*
  if (pathname.startsWith("/work-orders")) {
    const url = request.nextUrl.clone();
    url.pathname = "/operate" + pathname;
    return NextResponse.redirect(url, 308);
  }

  // Old /estimates/* → /operate/estimates/*
  if (pathname.startsWith("/estimates")) {
    const url = request.nextUrl.clone();
    url.pathname = "/operate" + pathname;
    return NextResponse.redirect(url, 308);
  }

  // Old /invoices/* → /operate/invoices/*
  if (pathname.startsWith("/invoices")) {
    const url = request.nextUrl.clone();
    url.pathname = "/operate" + pathname;
    return NextResponse.redirect(url, 308);
  }

  // Old /vendor → /pro/dashboard, /vendor/* → /pro/*
  if (pathname === "/vendor") {
    const url = request.nextUrl.clone();
    url.pathname = "/pro";
    return NextResponse.redirect(url, 308);
  }
  if (pathname.startsWith("/vendor/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/vendor/", "/pro/");
    return NextResponse.redirect(url, 308);
  }

  // ============================================
  // Role-based routing (new tier URLs)
  // ============================================

  const roleCookie = request.cookies.get("active_role")?.value;

  // Redirect vendor users away from /acquire and /operate → /pro
  if (
    roleCookie === "vendor" &&
    (pathname.startsWith("/acquire") || pathname.startsWith("/operate"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/pro";
    return NextResponse.redirect(url);
  }

  // Redirect PM users away from /pro → /acquire/dashboard
  if (roleCookie !== "vendor" && pathname.startsWith("/pro")) {
    // Exception: allow /pro/onboarding and /pro/accept-invite for any authenticated user
    if (
      pathname === "/pro/onboarding" ||
      pathname.startsWith("/pro/accept-invite")
    ) {
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/acquire/dashboard";
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
