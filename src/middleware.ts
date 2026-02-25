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

  // Skip role routing for public, auth, API, static, and legal paths
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname === "/" ||
    pathname === "/favicon.ico"
  ) {
    return response;
  }

  // Allow onboarding paths for any authenticated user (before role routing)
  if (
    pathname === "/home/onboarding" ||
    pathname === "/pro/onboarding" ||
    pathname.startsWith("/pro/accept-invite")
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
  if (roleCookie !== "vendor" && roleCookie !== "owner" && pathname.startsWith("/pro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/acquire/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect owner users away from PM/vendor paths → /home/dashboard
  if (
    roleCookie === "owner" &&
    (pathname.startsWith("/acquire") || pathname.startsWith("/operate") || pathname.startsWith("/pro"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/home/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect non-owner users away from /home → their default tier
  if (roleCookie !== "owner" && pathname.startsWith("/home") && pathname !== "/home/onboarding") {
    const url = request.nextUrl.clone();
    if (roleCookie === "vendor") {
      url.pathname = "/pro";
    } else {
      url.pathname = "/acquire/dashboard";
    }
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
