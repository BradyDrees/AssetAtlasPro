import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isQboConfigured, getQboAuthUrl } from "@/lib/integrations/qbo-client";

/**
 * GET /api/integrations/qbo/connect
 * Redirects to QuickBooks OAuth2 authorization page.
 */
export async function GET() {
  if (!isQboConfigured()) {
    return NextResponse.json({ error: "QuickBooks is not configured" }, { status: 503 });
  }

  // Get current user's vendor org
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const { data: vendorUser } = await supabase
    .from("vendor_users")
    .select("vendor_org_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!vendorUser || !["owner", "admin"].includes(vendorUser.role)) {
    return NextResponse.json({ error: "Unauthorized — owner/admin only" }, { status: 403 });
  }

  const authUrl = getQboAuthUrl(vendorUser.vendor_org_id);
  return NextResponse.redirect(authUrl);
}
