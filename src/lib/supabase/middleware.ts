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
    await supabase.auth.getUser();

    // NOTE: active_role cookie is managed exclusively by switchRole() server action.
    // We do NOT read from profiles here — doing so caused a race condition where
    // the middleware would overwrite a freshly-set role cookie before navigation completed.
  } catch {
    // Supabase unreachable (offline or network error).
    // Allow the request to proceed with whatever session cookie exists.
  }

  return supabaseResponse;
}
