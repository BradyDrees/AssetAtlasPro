import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/integrations/qbo/disconnect
 * Deactivates the QBO integration for the user's org.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get vendor org
  const { data: vendorUser } = await supabase
    .from("vendor_users")
    .select("vendor_org_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!vendorUser || !["owner", "admin"].includes(vendorUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Deactivate (don't delete — preserve sync history)
  await supabase
    .from("vendor_integrations")
    .update({
      is_active: false,
      access_token: null,
      refresh_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("vendor_org_id", vendorUser.vendor_org_id)
    .eq("provider", "quickbooks");

  return NextResponse.json({ success: true });
}
