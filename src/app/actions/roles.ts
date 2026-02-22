"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { switchActiveRole } from "@/lib/vendor/role-helpers";
import type { AppRole } from "@/lib/vendor/types";

/**
 * Server action: switch the user's active role.
 * 1. Validates membership in the target role's table
 * 2. Updates profile.active_role + profile.active_org_id
 * 3. Sets the active_role cookie (UX routing hint)
 * 4. Redirects to the appropriate dashboard
 */
export async function switchRole(role: AppRole, orgId?: string) {
  // switchActiveRole validates membership before updating profile
  const context = await switchActiveRole(role, orgId);

  // Set the cookie for middleware routing (UX hint only)
  const cookieStore = await cookies();
  cookieStore.set("active_role", context.active_role, {
    path: "/",
    maxAge: 31536000, // 1 year
    sameSite: "lax",
  });

  // Redirect to the appropriate dashboard
  if (context.active_role === "vendor") {
    redirect("/vendor");
  } else {
    redirect("/dashboard");
  }
}
