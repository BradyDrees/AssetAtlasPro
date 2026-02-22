import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token — wrapped in try/catch so offline
  // navigation still works with the cached session cookie.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Set role cookie from profile (UX redirect hint only — NOT a security boundary)
    if (user) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("active_role")
          .eq("id", user.id)
          .single();

        if (profile?.active_role) {
          supabaseResponse.cookies.set("active_role", profile.active_role, {
            path: "/",
            maxAge: 31536000, // 1 year
            sameSite: "lax",
            httpOnly: false, // Readable by client for UX routing
          });
        }
      } catch {
        // Profile query failed (table might not have active_role column yet)
        // Silently continue — role cookie stays at whatever it was
      }
    }
  } catch {
    // Supabase unreachable (offline or network error).
    // Allow the request to proceed with whatever session cookie exists.
  }

  return supabaseResponse;
}
