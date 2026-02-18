"use client";

import { useRouter } from "next/navigation";
import { useOffline } from "@/components/offline-provider";
import { useCallback } from "react";

/**
 * Drop-in replacement for useRouter() that is field-mode-aware.
 *
 * - In field mode: refresh() bumps localRevision (triggers re-renders
 *   from local data hooks) without hitting the server.
 * - In normal mode: refresh() calls the real router.refresh().
 * - refreshServer() always calls real refresh (escape hatch for post-sync).
 */
export function useFieldRouter() {
  const router = useRouter();
  const { isFieldMode, bumpRevision } = useOffline();

  const refresh = useCallback(() => {
    if (isFieldMode) {
      bumpRevision();
      return;
    }
    router.refresh();
  }, [isFieldMode, router, bumpRevision]);

  const refreshServer = useCallback(() => {
    router.refresh();
  }, [router]);

  return {
    ...router,
    refresh,
    refreshServer,
  };
}
