import { NextRequest, NextResponse } from "next/server";
import { exchangeQboCode } from "@/lib/integrations/qbo-client";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/integrations/qbo/callback
 * OAuth callback — exchanges code for tokens, stores integration.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const vendorOrgId = searchParams.get("state"); // passed through OAuth state

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://assetatlaspro.com";

  if (!code || !realmId || !vendorOrgId) {
    return NextResponse.redirect(`${baseUrl}/vendor/profile/settings?qbo=error`);
  }

  // Exchange code for tokens
  const tokens = await exchangeQboCode(code, realmId);
  if (tokens.error) {
    console.error("[QBO Callback] Token exchange failed:", tokens.error);
    return NextResponse.redirect(`${baseUrl}/vendor/profile/settings?qbo=error`);
  }

  // Store integration
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await supabase
    .from("vendor_integrations")
    .upsert(
      {
        vendor_org_id: vendorOrgId,
        provider: "quickbooks",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        realm_id: realmId,
        is_active: true,
        sync_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "vendor_org_id,provider" }
    );

  if (error) {
    console.error("[QBO Callback] Failed to store integration:", error);
    return NextResponse.redirect(`${baseUrl}/vendor/profile/settings?qbo=error`);
  }

  return NextResponse.redirect(`${baseUrl}/vendor/profile/settings?qbo=connected`);
}
