"use server";

import { switchActiveRole } from "@/lib/vendor/role-helpers";
import type { AppRole } from "@/lib/vendor/types";

/**
 * Server action to switch the user's active role.
 * Updates the profiles table so the middleware cookie stays in sync.
 */
export async function switchRole(
  newRole: AppRole
): Promise<{ success: boolean; error?: string }> {
  try {
    await switchActiveRole(newRole);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to switch role",
    };
  }
}
