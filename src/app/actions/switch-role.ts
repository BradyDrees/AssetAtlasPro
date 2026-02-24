"use server";

import { cookies } from "next/headers";
import { switchActiveRole } from "@/lib/vendor/role-helpers";
import type { AppRole } from "@/lib/vendor/types";

/**
 * Server action to switch the user's active role.
 * Updates the profiles table AND sets the active_role cookie server-side
 * so the middleware sees the correct value on the next request.
 */
export async function switchRole(
  newRole: AppRole
): Promise<{ success: boolean; error?: string }> {
  try {
    await switchActiveRole(newRole);

    // Set cookie server-side so middleware sees it immediately
    const cookieStore = await cookies();
    cookieStore.set("active_role", newRole, {
      path: "/",
      maxAge: 31536000, // 1 year
      sameSite: "lax",
      httpOnly: false,
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to switch role",
    };
  }
}
