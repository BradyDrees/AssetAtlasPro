"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/vendor/role-helpers";

interface OnboardingInput {
  companyName: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  trades: string[];
  serviceRadius?: number;
  maxConcurrentJobs?: number;
  description?: string;
}

/**
 * Server action: Create a vendor organization + vendor user + user_role atomically.
 *
 * Called during first-time vendor onboarding.
 * The vendor_org_insert RLS policy allows INSERT WITH CHECK (true)
 * because the user has no vendor_users row yet at this point (Correction 2).
 */
export async function createVendorAccount(input: OnboardingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user already has a vendor account
  const { data: existingVendorUser } = await supabase
    .from("vendor_users")
    .select("id, vendor_org_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (existingVendorUser) {
    return { error: "already_exists" };
  }

  // Step 1: Create vendor organization
  // Generate UUID client-side so we don't need .select() after insert
  // (.select() triggers a SELECT which fails RLS before vendor_users row exists)
  const orgId = crypto.randomUUID();

  const { error: orgError } = await supabase
    .from("vendor_organizations")
    .insert({
      id: orgId,
      name: input.companyName,
      phone: input.phone || null,
      email: input.email || user.email || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      trades: input.trades,
      service_radius_miles: input.serviceRadius || 25,
      max_concurrent_jobs: input.maxConcurrentJobs || 10,
      description: input.description || null,
      updated_by: user.id,
    });

  if (orgError) {
    console.error("Failed to create vendor org:", orgError);
    return { error: `Org create failed: ${orgError.message}` };
  }

  // Step 2: Create vendor user record (owner role)
  const { error: vuError } = await supabase.from("vendor_users").insert({
    user_id: user.id,
    vendor_org_id: orgId,
    role: "owner",
    email: user.email || input.email || null,
    phone: input.phone || null,
    trades: input.trades,
  });

  if (vuError) {
    console.error("Failed to create vendor user:", vuError);
    // Attempt to clean up the org we just created
    await supabase.from("vendor_organizations").delete().eq("id", orgId);
    return { error: `Vendor user failed: ${vuError.message}` };
  }

  // Step 3: Add vendor role to user_roles table
  await supabase.from("user_roles").insert({
    user_id: user.id,
    role: "vendor",
    org_id: orgId,
    org_type: "vendor_org",
  });

  // Step 4: Update profile to set active_role = vendor
  await supabase
    .from("profiles")
    .update({
      active_role: "vendor",
      active_org_id: orgId,
    })
    .eq("id", user.id);

  // Step 5: Set the active_role cookie (UX routing hint)
  const cookieStore = await cookies();
  cookieStore.set("active_role", "vendor", {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });

  // Step 6: Log the activity
  await logActivity({
    entityType: "vendor_user",
    entityId: user.id,
    action: "vendor_account_created",
    actorRole: "vendor_owner",
    newValue: orgId,
    metadata: {
      company_name: input.companyName,
      trades: input.trades,
    },
  });

  // Redirect to vendor dashboard
  redirect("/vendor");
}
